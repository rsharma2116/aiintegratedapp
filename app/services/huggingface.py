# app/services/huggingface.py

import os
import requests
from dotenv import load_dotenv
import logging

# Set up logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

HUGGINGFACE_API_KEY = os.getenv("HF_API_KEY")
MODEL_NAME = "gpt2"  # or another available model
API_URL = f"https://api-inference.huggingface.co/models/{MODEL_NAME}"
headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}


def query_huggingface(payload: str) -> str:
    try:
        logger.info(f"Sending to HF API: {payload}")
        
        # Check model status
        health_check = requests.get(API_URL, headers=headers, timeout=10)
        logger.info(f"Model health check: {health_check.status_code}")
        
        if health_check.status_code == 503:
            return "The AI model is still loading. Please try again in 30 seconds."

        # Make the prediction request
        response = requests.post(
            API_URL,
            headers=headers,
            json={
                "inputs": payload,
                "parameters": {
                    "max_new_tokens": 100,
                    "temperature": 0.7,
                    "return_full_text": False,
                    "do_sample": True
                }
            },
            timeout=30
        )
        
        logger.info(f"HF API response: {response.status_code}, {response.text}")
        response.raise_for_status()
        
        result = response.json()
        logger.info(f"Parsed response: {result}")
        
        if isinstance(result, list) and result and isinstance(result[0], dict):
            return result[0].get('generated_text', 'No text generated')
        return str(result)

    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {str(e)}")
        return f"Connection error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return f"AI service error: {str(e)}"