from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
import numpy as np

app = FastAPI()

tokenizer = AutoTokenizer.from_pretrained("dslim/bert-base-NER")
model = AutoModelForTokenClassification.from_pretrained("dslim/bert-base-NER")
ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer)


class Text(BaseModel):
    text: str


@app.post("/ner")
def get_named_entities(text: Text):
    text = text.text

    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    ner_results = ner_pipeline(text)

    organizations = []
    current_org = ""

    for entity in ner_results:
        if entity["entity"] == "B-ORG":
            current_org = entity["word"]
        elif entity["entity"] == "I-ORG":
            current_org += " " + entity["word"]
        else:
            if current_org:
                organizations.append(current_org)
                current_org = ""

    if current_org:
        organizations.append(current_org)

    return {"organizations": organizations}


def convert_to_serializable(ner_results):
    serializable_results = []
    for entity in ner_results:
        serializable_entity = {}
        for key, value in entity.items():
            if isinstance(value, np.generic):
                value = value.item()
            serializable_entity[key] = value
        serializable_results.append(serializable_entity)
    return serializable_results


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
