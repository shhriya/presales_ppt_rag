# ragas_evaluator.py
import math
import os
from ragas import evaluate
from ragas.metrics import context_precision, context_recall, faithfulness
from ragas.dataset_schema import EvaluationDataset
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
 
class RAGASEvaluator:
    """
    RAGAS evaluator for local testing with version 0.3.9 using Gemini.
    """
 
    def __init__(self, model_name: str = "gemini-2.5-flash"):
        print(f"🚀 Initializing RAGAS evaluator with {model_name}...")
       
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("[ERROR] GEMINI_API_KEY not found in environment")
            raise ValueError("GEMINI_API_KEY is required for evaluation")
 
        # Initialize Gemini LLM for RAGAS
        self.llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0
        )
       
        # Initialize Gemini Embeddings for RAGAS
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=api_key
        )
       
        print(f"✅ Gemini LLM and Embeddings initialized for RAGAS")
 
    def run_metrics(self, question: str, answer: str, contexts: list[str], ground_truth: str | None = None) -> dict:
        print("\n🔥 Running RAGAS metrics …")
        print("➡️ Question:", question)
        print("➡️ Answer:", answer)
        print("➡️ Ground Truth:", ground_truth[:100] if ground_truth else "Not provided")
        print("➡️ Number of Contexts:", len(contexts))
        if contexts:
            print("➡️ First context snippet:", contexts[0][:200], "...")
 
        # Prepare dataset
        sample = {
            "user_input": question,
            "response": answer,
            "retrieved_contexts": contexts,
            "reference": ground_truth if ground_truth else " ".join([c.strip() for c in contexts if c.strip()]),
        }
 
        try:
            dataset = EvaluationDataset.from_list([sample])
            print("📌 Dataset created successfully")
        except Exception as e:
            print(f"[ERROR] Could not build dataset: {e}")
            return {}
 
        try:
            print("⏳ Calling ragas.evaluate() …")
            result = evaluate(
                dataset=dataset,
                metrics=[context_precision, context_recall, faithfulness],
                llm=self.llm,
                embeddings=self.embeddings
            )
            print("✅ Evaluation completed")
        except Exception as e:
            print(f"[ERROR] Ragas evaluation failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                "context_precision": float("nan"),
                "context_recall": float("nan"),
                "faithfulness": float("nan"),
            }
 
        scores = {}
        try:
            print(f"📊 Raw Result Type: {type(result)}")
           
            if hasattr(result, "to_pandas"):
                df = result.to_pandas()
                scores = df.iloc[0].to_dict()
                print("📊 Scores extracted from Result.to_pandas()")
            elif isinstance(result, dict):
                scores = result
                print("📊 Result is already a dict")
            else:
                scores = dict(result)
                print("📊 Result converted via dict()")
 
            print("--- EVALUATION SCORES ---")
            for m, v in scores.items():
                if m in ["user_input", "response", "retrieved_contexts", "reference"]:
                    continue
                print(f"✅ {m} = {v}")
            print("-------------------------")
 
        except Exception as e:
            print(f"[ERROR] Score parsing failure: {e}")
 
        return scores
 
async def run_ragas_metrics(question: str, answer: str, contexts: list[str], ground_truth: str | None = None):
    print("\n[run_ragas_metrics] Start...")
 
    try:
        evaluator = RAGASEvaluator(model_name="gemini-1.5-flash")
 
        scores = evaluator.run_metrics(
            question=question,
            answer=answer,
            contexts=contexts,
            ground_truth=ground_truth
        )
 
        clean_scores = {
            "faithfulness": scores.get("faithfulness"),
            "context_precision": scores.get("context_precision"),
            "context_recall": scores.get("context_recall"),
            "overall_score": None
        }
 
        if clean_scores["faithfulness"] is None:
            clean_scores["faithfulness"] = scores.get("faithfulness_score")
        if clean_scores["context_precision"] is None:
            clean_scores["context_precision"] = scores.get("context_precision_score")
        if clean_scores["context_recall"] is None:
            clean_scores["context_recall"] = scores.get("context_recall_score")
 
        print("[run_ragas_metrics] Cleaned scores for DB:", clean_scores)
        return clean_scores
 
    except Exception as e:
        print(f"[run_ragas_metrics] CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {
            "faithfulness": None,
            "context_precision": None,
            "context_recall": None,
            "overall_score": None
        }