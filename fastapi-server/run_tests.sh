#!/bin/bash

source venv/bin/activate
pip install -r requirements.txt
pytest tests/test_rabbitmq.py -v 