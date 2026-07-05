import os
from dotenv import load_dotenv
load_dotenv()

from main import compute_similarity, run_llm_judge, check_instruction_following

prompt_content = "Summarize the text in bullet points. Use 50 words or less. Format as JSON."
actual = """```json
{
  "summary": [
    "- Patient complains of headache.",
    "- Took Tylenol with no relief."
  ]
}
```"""
expected = "Patient complains of headache and took Tylenol with no relief."

print("=== Semantic Similarity ===")
sim = compute_similarity(expected, actual)
print(f"Score: {sim:.2f}")

print("\n=== LLM Judge ===")
judge = run_llm_judge(expected, actual)
print(f"Score: {judge['score']}/10")
print(f"Reasoning: {judge['reasoning']}")

print("\n=== Instruction Following ===")
inst = check_instruction_following(prompt_content, actual)
print(f"Rules Passed: {inst['passed']}")
print(f"Score: {inst['score']:.2f}%")
