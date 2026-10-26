
import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://madhu2694.github.io",
            "http://localhost:8000"
        ]
    }
})

API_KEY = os.environ.get("GROQ_API_KEY")
MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")

SYSTEM_PROMPT = """
You are MORROW, a practical goal-planning assistant.
Return ONLY valid JSON with this schema:
{
  "paths": [
    {
      "title": "short title",
      "subtitle": "short label",
      "description": "2-3 useful sentences",
      "effort": "Low / Medium / High",
      "best": "short use case",
      "tasks": [
        "task 1",
        "task 2",
        "task 3",
        "task 4",
        "task 5"
      ]
    }
  ]
}
Return exactly 5 paths and 5-7 actionable tasks per path.
Keep advice realistic and safe. Do not use markdown fences.
"""

@app.get("/")
def home():
    return jsonify({
        "service": "MORROW AI",
        "status": "online"
    })

@app.post("/api/generate")
def generate():
    if not API_KEY:
        return jsonify({
            "error": "AI service is not configured."
        }), 503

    data = request.get_json(silent=True) or {}
    goal = str(data.get("goal", "")).strip()

    if not goal or len(goal) > 2000:
        return jsonify({
            "error": "Enter a goal between 1 and 2,000 characters."
        }), 400

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            "Create exactly five personalized routes, "
                            "each with 5-7 actionable tasks, for this goal: "
                            f"{goal}"
                        )
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 3000,
                "response_format": {"type": "json_object"}
            },
            timeout=60
        )

        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        plan = json.loads(content)
        paths = plan.get("paths")

        if not isinstance(paths, list) or len(paths) != 5:
            raise ValueError("AI must return exactly five paths.")

        clean = []

        for item in paths:
            if not isinstance(item, dict):
                raise ValueError("Each path must be a JSON object.")

            tasks = item.get("tasks", [])

            if not isinstance(tasks, list) or not 5 <= len(tasks) <= 7:
                raise ValueError(
                    "Each path must contain 5 to 7 tasks."
                )

            clean.append({
                "title": str(
                    item.get("title", "Explore a direction")
                )[:50],
                "subtitle": str(
                    item.get("subtitle", "A possible path")
                )[:40],
                "description": str(item.get("description", ""))[:700],
                "effort": str(item.get("effort", "Medium"))[:30],
                "best": str(item.get("best", "Making progress"))[:60],
                "tasks": [str(task)[:160] for task in tasks]
            })

        return jsonify({"paths": clean, "model": MODEL})

    except requests.RequestException:
        app.logger.exception("Groq request failed")
        return jsonify({
            "error": "The AI service is temporarily unavailable. Please try again."
        }), 502

    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        app.logger.exception("Invalid AI response")
        return jsonify({
            "error": "MORROW could not process the AI response. Please try again."
        }), 502


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
    )
