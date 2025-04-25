import os
import pika
from typing import Optional, Callable
import json

class RabbitMQ:
    def __init__(self):
        self.url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
        self._connection = None
        self._channel = None

    def connect(self) -> None:
        """Устанавливает соединение с RabbitMQ"""
        if not self._connection or self._connection.is_closed:
            parameters = pika.URLParameters(self.url)
            self._connection = pika.BlockingConnection(parameters)
            self._channel = self._connection.channel()

    def close(self) -> None:
        """Закрывает соединение с RabbitMQ"""
        if self._connection and not self._connection.is_closed:
            self._connection.close()

    def declare_queue(self, queue_name: str) -> None:
        """Объявляет очередь"""
        self.connect()
        self._channel.queue_declare(queue=queue_name, durable=True)

    def publish(self, queue_name: str, message: dict) -> None:
        """Публикует сообщение в очередь"""
        if not self._connection or self._connection.is_closed:
            raise AttributeError("Нет активного соединения с RabbitMQ")
        self._channel.basic_publish(
            exchange='',
            routing_key=queue_name,
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # делаем сообщение постоянным
            )
        )

    def consume(self, queue_name: str, callback: Callable) -> None:
        """Начинает потребление сообщений из очереди"""
        if not self._connection or self._connection.is_closed:
            raise AttributeError("Нет активного соединения с RabbitMQ")
        self._channel.basic_consume(
            queue=queue_name,
            on_message_callback=callback,
            auto_ack=True
        )
        self._channel.start_consuming()

rabbitmq = RabbitMQ() 