import math
from ragas import evaluate
from ragas.metrics import context_precision, context_recall, faithfulness
from ragas.dataset_schema import EvaluationDataset
from ragas.llms import llm_factory
 
class RAGASEvaluator:
    """
    RAGAS evaluator for local testing with version 0.3.9.
    """
 
    def __init__(self, model_name: str = "gpt-3.5-turbo"):
        print("🚀 Initializing RAGAS evaluator...")
        # Only pass model_name, no other kwargs
        self.llm = llm_factory(model_name)
        print(f"✅ LLM '{model_name}' initialized")
 
    def run_metrics(self, question: str, answer: str, contexts: list[str]) -> dict:
        print("\n🔥 Running RAGAS metrics …")
        print("➡️ Question:", question)
        print("➡️ Answer:", answer)
        print("➡️ Number of Contexts:", len(contexts))
        if contexts:
            print("➡️ First context:", contexts[0][:200], "...")
 
        reference_text = " ".join([c.strip() for c in contexts if c.strip()])
        sample = {
            "user_input": question,
            "response": answer,
            "retrieved_contexts": contexts,
            "reference": reference_text,
        }
 
        try:
            dataset = EvaluationDataset.from_list([sample])
            print("📌 Dataset created via from_list()")
        except Exception as e:
            print(f"[ERROR] Could not build dataset: {e}")
            return {}
 
        try:
            print("⏳ Calling evaluate() …")
            result_list = evaluate(
                dataset,
                metrics=[context_precision, context_recall, faithfulness],
                llm=self.llm,
            )
            print("✅ Evaluation done")
        except Exception as e:
            print(f"[ERROR] Evaluation error: {e}")
            return {
                "context_precision": float("nan"),
                "context_recall": float("nan"),
                "faithfulness": float("nan"),
            }
 
        scores = {}
        try:
            raw = result_list[0] if isinstance(result_list, list) else result_list
            if hasattr(raw, "scores"):
                scores = raw.scores
            elif isinstance(raw, dict):
                scores = raw
            print("📊 Raw result:", raw)
            print("📊 Scores:", scores)
 
            # Safely handle list of dicts
            if isinstance(scores, list) and len(scores) > 0:
                scores_dict = scores[0]
            else:
                scores_dict = scores if isinstance(scores, dict) else {}
 
            for m, v in scores_dict.items():
                val_str = f"{v:.4f}" if isinstance(v, (int, float)) and not math.isnan(v) else str(v)
                print(f"✅ {m} = {val_str}")
 
        except Exception as e:
            print(f"[ERROR] Parsing scores: {e}")
 
        return scores
 
async def run_ragas_metrics(question: str, answer: str, contexts: list[str]):
    print("\n[run_ragas_metrics] Starting evaluation...")
 
    try:
        evaluator = RAGASEvaluator(model_name="gpt-3.5-turbo")
 
        scores = evaluator.run_metrics(
            question=question,
            answer=answer,
            contexts=contexts
        )
 
        # FIX: scores is a LIST → extract first element
        if isinstance(scores, list) and len(scores) > 0:
            scores = scores[0]
 
        # Now scores is a dict, safe to use .get()
        clean_scores = {
            "faithfulness": scores.get("faithfulness") or scores.get("faithfulness_score"),
            "context_precision": scores.get("context_precision") or scores.get("context_precision_score"),
            "context_recall": scores.get("context_recall") or scores.get("context_recall_score"),
            "overall_score": None
        }
 
        print("[run_ragas_metrics] Final cleaned scores:", clean_scores)
        return clean_scores
 
    except Exception as e:
        print(f"[run_ragas_metrics] ERROR: {e}")
        return {
            "faithfulness": None,
            "context_precision": None,
            "context_recall": None,
            "overall_score": None
        }
 