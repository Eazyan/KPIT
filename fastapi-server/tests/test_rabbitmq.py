import pytest
import pika
import json
import time
from app.utils.rabbitmq import RabbitMQ
import threading
import socket

class TestRabbitMQ:
    @pytest.fixture
    def rabbitmq(self):
        """Фикстура для создания экземпляра RabbitMQ"""
        return RabbitMQ()

    @pytest.fixture
    def test_queue(self):
        """Фикстура для создания тестовой очереди"""
        return "test_queue"

    def test_connection(self, rabbitmq):
        """Проверка установки соединения"""
        rabbitmq.connect()
        assert rabbitmq._connection is not None
        assert not rabbitmq._connection.is_closed
        rabbitmq.close()

    def test_queue_declaration(self, rabbitmq, test_queue):
        """Проверка объявления очереди"""
        rabbitmq.connect()
        rabbitmq.declare_queue(test_queue)
        
        # Проверяем, что очередь существует
        channel = rabbitmq._channel
        method_frame = channel.queue_declare(queue=test_queue, passive=True)
        assert method_frame.method.queue == test_queue
        rabbitmq.close()

    def test_publish_and_consume(self, rabbitmq, test_queue):
        """Проверка публикации и потребления сообщений"""
        test_message = {"test": "message"}
        received_messages = []

        def callback(ch, method, properties, body):
            received_messages.append(json.loads(body))
            ch.stop_consuming()

        # Подготавливаем очередь
        rabbitmq.connect()
        rabbitmq.declare_queue(test_queue)

        # Публикуем сообщение
        rabbitmq.publish(test_queue, test_message)

        # Потребляем сообщение
        rabbitmq.consume(test_queue, callback)

        # Проверяем, что сообщение было получено
        assert len(received_messages) == 1
        assert received_messages[0] == test_message
        rabbitmq.close()

    def test_message_persistence(self, rabbitmq, test_queue):
        """Проверка сохранения сообщений"""
        test_message = {"persistent": "message"}
        received_messages = []

        def callback(ch, method, properties, body):
            received_messages.append(json.loads(body))
            ch.stop_consuming()

        # Подготавливаем очередь
        rabbitmq.connect()
        rabbitmq.declare_queue(test_queue)

        # Публикуем сообщение
        rabbitmq.publish(test_queue, test_message)

        # Закрываем соединение
        rabbitmq.close()

        # Создаем новое соединение
        new_rabbitmq = RabbitMQ()
        new_rabbitmq.connect()

        # Потребляем сообщение
        new_rabbitmq.consume(test_queue, callback)

        # Проверяем, что сообщение было получено
        assert len(received_messages) == 1
        assert received_messages[0] == test_message
        new_rabbitmq.close()

    def test_multiple_messages(self, rabbitmq, test_queue):
        """Проверка отправки и получения нескольких сообщений"""
        messages = [
            {"id": 1, "content": "Первое сообщение"},
            {"id": 2, "content": "Второе сообщение"},
            {"id": 3, "content": "Третье сообщение"}
        ]
        received_messages = []

        def callback(ch, method, properties, body):
            received_messages.append(json.loads(body))
            if len(received_messages) == len(messages):
                ch.stop_consuming()

        # Подготавливаем очередь
        rabbitmq.connect()
        rabbitmq.declare_queue(test_queue)

        # Публикуем сообщения
        for message in messages:
            rabbitmq.publish(test_queue, message)

        # Потребляем сообщения
        rabbitmq.consume(test_queue, callback)

        # Проверяем, что все сообщения были получены в правильном порядке
        assert len(received_messages) == len(messages)
        assert received_messages == messages
        rabbitmq.close()

    def test_large_message(self, rabbitmq, test_queue):
        """Проверка отправки большого сообщения"""
        large_message = {"data": "x" * 1000000}  # 1MB сообщение
        received_messages = []

        def callback(ch, method, properties, body):
            received_messages.append(json.loads(body))
            ch.stop_consuming()

        # Подготавливаем очередь
        rabbitmq.connect()
        rabbitmq.declare_queue(test_queue)

        # Публикуем большое сообщение
        rabbitmq.publish(test_queue, large_message)

        # Потребляем сообщение
        rabbitmq.consume(test_queue, callback)

        # Проверяем, что сообщение было получено без ошибок
        assert len(received_messages) == 1
        assert received_messages[0] == large_message
        rabbitmq.close()

    def test_concurrent_consumers(self, rabbitmq, test_queue):
        """Проверка работы нескольких потребителей"""
        messages = [
            {"id": 1, "content": "Сообщение 1"},
            {"id": 2, "content": "Сообщение 2"}
        ]
        received_messages1 = []
        received_messages2 = []
        event1 = threading.Event()
        event2 = threading.Event()

        def callback1(ch, method, properties, body):
            received_messages1.append(json.loads(body))
            event1.set()
            ch.stop_consuming()

        def callback2(ch, method, properties, body):
            received_messages2.append(json.loads(body))
            event2.set()
            ch.stop_consuming()

        # Подготавливаем очередь
        rabbitmq.connect()
        rabbitmq.declare_queue(test_queue)

        # Создаем два отдельных соединения для потребителей
        consumer1 = RabbitMQ()
        consumer2 = RabbitMQ()
        consumer1.connect()
        consumer2.connect()

        # Запускаем потребителей в разных потоках
        thread1 = threading.Thread(target=lambda: consumer1.consume(test_queue, callback1))
        thread2 = threading.Thread(target=lambda: consumer2.consume(test_queue, callback2))

        thread1.start()
        thread2.start()

        # Даем время потребителям подключиться
        time.sleep(1)

        # Публикуем сообщения
        for message in messages:
            rabbitmq.publish(test_queue, message)

        # Ждем завершения обоих потребителей с таймаутом
        event1.wait(timeout=4)
        event2.wait(timeout=4)

        thread1.join(timeout=4)
        thread2.join(timeout=4)

        # Проверяем, что сообщения были распределены между потребителями
        assert len(received_messages1) + len(received_messages2) == len(messages)

    def test_error_handling(self, rabbitmq):
        """Проверка обработки ошибок"""
        # Попытка публикации без подключения
        with pytest.raises(AttributeError):
            rabbitmq.publish("test_queue", {"test": "message"})

        # Попытка потребления без подключения
        with pytest.raises(AttributeError):
            rabbitmq.consume("test_queue", lambda *args: None)

        # Попытка подключения к несуществующему серверу
        rabbitmq.url = "amqp://guest:guest@nonexistent:5672/"
        with pytest.raises((pika.exceptions.AMQPConnectionError, socket.gaierror)):
            rabbitmq.connect() 