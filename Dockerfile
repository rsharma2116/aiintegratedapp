FROM python:3.11-slim

WORKDIR /app

# Copy the requirements file
COPY requirements.txt  requirements.txt

# Install the Python dependencies
RUN pip install -r requirements.txt

COPY . . 

CMD uvicorn main:app
