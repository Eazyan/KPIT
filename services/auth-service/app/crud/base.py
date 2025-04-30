from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

ModelType = TypeVar("ModelType", bound=BaseModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model
        self.collection_name = model.__name__.lower()

    async def get(self, db: AsyncIOMotorDatabase, id: Any) -> Optional[ModelType]:
        document = await db[self.collection_name].find_one({"_id": id})
        return self.model(**document) if document else None

    async def get_multi(
        self, db: AsyncIOMotorDatabase, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        cursor = db[self.collection_name].find().skip(skip).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self.model(**doc) for doc in documents]

    async def create(self, db: AsyncIOMotorDatabase, *, obj_in: CreateSchemaType) -> ModelType:
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data)
        await db[self.collection_name].insert_one(db_obj.dict())
        return db_obj

    async def update(
        self,
        db: AsyncIOMotorDatabase,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        await db[self.collection_name].update_one(
            {"_id": db_obj.id}, {"$set": update_data}
        )
        return db_obj

    async def remove(self, db: AsyncIOMotorDatabase, *, id: str) -> ModelType:
        document = await db[self.collection_name].find_one_and_delete({"_id": id})
        return self.model(**document) if document else None 