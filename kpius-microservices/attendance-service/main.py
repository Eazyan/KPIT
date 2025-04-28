import uvicorn
import os
from app.core.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("SERVICE_PORT", settings.service_port)),
        reload=True
    ) 