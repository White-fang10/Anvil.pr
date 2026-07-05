import json
from datetime import datetime, timezone, timedelta
from database import SessionLocal, engine
from models import Base, Project, Prompt, PromptVersion, Dataset, EvaluationRun

def run_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check for idempotency
    existing_project = db.query(Project).filter(Project.name == "Medical Chatbot").first()
    if existing_project:
        print("Seed script already ran (Medical Chatbot project exists). Exiting.")
        return

    print("Seeding database...")
    now = datetime.now(timezone.utc)
    
    # 1. Create Project
    project = Project(name="Medical Chatbot", created_at=now - timedelta(days=5))
    db.add(project)
    db.commit()
    db.refresh(project)

    # 2. Create Dataset
    dataset_rows = [
        {"input": "Pt c/o headaches and nausea. Took Tylenol.", "expected_output": "Patient complains of headaches and nausea. Medication: Tylenol."},
        {"input": "Knee pain left leg since 3 days.", "expected_output": "Left knee pain persisting for 3 days."},
        {"input": "Sore throat, mild fever.", "expected_output": "Sore throat accompanied by mild fever."},
        {"input": "Back pain radiating to left leg.", "expected_output": "Back pain radiating to the left leg."},
        {"input": "SOB and chest tightness.", "expected_output": "Shortness of breath and chest tightness."},
        {"input": "Abdominal pain after eating.", "expected_output": "Abdominal pain occurring postprandial."},
        {"input": "Dizziness upon standing.", "expected_output": "Orthostatic dizziness."},
        {"input": "Right shoulder pain, limited ROM.", "expected_output": "Right shoulder pain with limited range of motion."}
    ]
    
    dataset = Dataset(
        project_id=project.id,
        name="ER Triage Sample (8 rows)",
        rows_json=dataset_rows,
        created_at=now - timedelta(days=4)
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # 3. Create Prompt
    prompt = Prompt(
        project_id=project.id,
        name="Patient Summary",
        created_at=now - timedelta(days=4)
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)

    # 4. Create Versions
    v1 = PromptVersion(
        prompt_id=prompt.id,
        version_number=1,
        content="Summarize this patient's report",
        created_at=now - timedelta(days=3)
    )
    v2 = PromptVersion(
        prompt_id=prompt.id,
        version_number=2,
        content="Summarize this patient's report in easy English, max 100 words, bullet points",
        created_at=now - timedelta(days=2)
    )
    v3 = PromptVersion(
        prompt_id=prompt.id,
        version_number=3,
        content="You are an experienced physician. Summarize this patient's report in easy English, max 100 words, bullet points. Always output JSON. Include a one-line diagnosis guess with a confidence score.",
        created_at=now - timedelta(days=1)
    )
    
    db.add_all([v1, v2, v3])
    db.commit()
    db.refresh(v1)
    db.refresh(v2)
    db.refresh(v3)

    # 5. Create Evaluation Runs
    models = ["gpt-4o-mini", "groq/llama-3.1-8b-instant"]
    
    # Trends configuration: (accuracy_base, lat_base, cost_base)
    version_metrics = {
        1: {"acc": [68.5, 71.2], "lat": [420.1, 445.0], "cost": [0.00032, 0.00015]},
        2: {"acc": [84.1, 85.8], "lat": [415.5, 430.2], "cost": [0.00035, 0.00016]},
        3: {"acc": [93.7, 95.1], "lat": [395.2, 410.8], "cost": [0.00038, 0.00018]}
    }
    
    runs_to_insert = []
    
    for v, version_obj in [(1, v1), (2, v2), (3, v3)]:
        for i, model_name in enumerate(models):
            acc = version_metrics[v]["acc"][i]
            lat = version_metrics[v]["lat"][i]
            cost = version_metrics[v]["cost"][i]
            
            # Create synthetic results_json
            results_json = []
            for row in dataset_rows:
                results_json.append({
                    "input": row["input"],
                    "expected_output": row["expected_output"],
                    "model": model_name,
                    "output": "Synthetic output generated for demo...",
                    "latency_ms": lat + (i * 10),  # Slight variation
                    "cost_usd": cost,
                    "error": None,
                    "semantic_score": acc - 5,
                    "judge_score": (acc + 5) / 10,
                    "judge_reasoning": "Output matches criteria closely.",
                    "instruction_following_score": acc,
                    "instruction_following_results": {"json": True}
                })
                
            eval_run = EvaluationRun(
                version_id=version_obj.id,
                dataset_id=dataset.id,
                model=model_name,
                results_json=results_json,
                avg_accuracy=acc,
                avg_latency_ms=lat,
                avg_cost_usd=cost,
                created_at=version_obj.created_at + timedelta(hours=1)
            )
            runs_to_insert.append(eval_run)
            
    db.add_all(runs_to_insert)
    db.commit()
    
    print("Seed complete! 1 Project, 1 Dataset, 1 Prompt, 3 Versions, 6 Evaluation Runs created.")
    db.close()

if __name__ == "__main__":
    run_seed()
