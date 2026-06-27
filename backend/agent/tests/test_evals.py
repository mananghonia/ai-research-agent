from unittest.mock import patch, MagicMock
from django.test import TestCase
from agent.core.evals import run_eval


VALID_JSON = '''{
  "accuracy":       {"score": 8, "reason": "Well-grounded in sources."},
  "completeness":   {"score": 7, "reason": "Covers main angles."},
  "clarity":        {"score": 9, "reason": "Clear and well-structured."},
  "source_quality": {"score": 6, "reason": "Mix of good and average sources."}
}'''


def _mock_client(response_text: str):
    """Build a mock Anthropic client that returns a given text."""
    client = MagicMock()
    msg = MagicMock()
    msg.content = [MagicMock(text=response_text)]
    client.messages.create.return_value = msg
    return client


class RunEvalTests(TestCase):

    # ── Happy path ───────────────────────────────────────────────

    @patch('agent.core.evals.get_client')
    def test_valid_response_returns_scores(self, mock_get_client):
        mock_get_client.return_value = _mock_client(VALID_JSON)
        result = run_eval("quantum computing", "## Intro\n" + "A" * 200, [{"url": "https://x.com", "title": "X"}])

        self.assertIsNotNone(result)
        self.assertEqual(result['accuracy']['score'], 8)
        self.assertEqual(result['completeness']['score'], 7)
        self.assertEqual(result['clarity']['score'], 9)
        self.assertEqual(result['source_quality']['score'], 6)
        self.assertAlmostEqual(result['overall'], 7.5)

    @patch('agent.core.evals.get_client')
    def test_strips_markdown_code_fence(self, mock_get_client):
        wrapped = f"```json\n{VALID_JSON}\n```"
        mock_get_client.return_value = _mock_client(wrapped)
        result = run_eval("topic", "content", [])
        self.assertIsNotNone(result)
        self.assertEqual(result['accuracy']['score'], 8)

    @patch('agent.core.evals.get_client')
    def test_overall_is_average_of_four(self, mock_get_client):
        json_str = '''{
          "accuracy":       {"score": 10, "reason": "r"},
          "completeness":   {"score": 10, "reason": "r"},
          "clarity":        {"score": 10, "reason": "r"},
          "source_quality": {"score": 10, "reason": "r"}
        }'''
        mock_get_client.return_value = _mock_client(json_str)
        result = run_eval("topic", "content", [])
        self.assertEqual(result['overall'], 10.0)

    @patch('agent.core.evals.get_client')
    def test_scores_clamped_to_0_10(self, mock_get_client):
        json_str = '''{
          "accuracy":       {"score": 15, "reason": "over"},
          "completeness":   {"score": -5, "reason": "under"},
          "clarity":        {"score": 8,  "reason": "fine"},
          "source_quality": {"score": 7,  "reason": "fine"}
        }'''
        mock_get_client.return_value = _mock_client(json_str)
        result = run_eval("topic", "content", [])
        self.assertEqual(result['accuracy']['score'], 10)      # clamped down
        self.assertEqual(result['completeness']['score'], 0)   # clamped up

    # ── Error handling ───────────────────────────────────────────

    @patch('agent.core.evals.get_client')
    def test_malformed_json_returns_none(self, mock_get_client):
        mock_get_client.return_value = _mock_client("this is not json at all")
        result = run_eval("topic", "content", [])
        self.assertIsNone(result)

    @patch('agent.core.evals.get_client')
    def test_missing_dimension_returns_none(self, mock_get_client):
        # clarity key missing
        json_str = '''{
          "accuracy":       {"score": 8, "reason": "r"},
          "completeness":   {"score": 7, "reason": "r"},
          "source_quality": {"score": 6, "reason": "r"}
        }'''
        mock_get_client.return_value = _mock_client(json_str)
        result = run_eval("topic", "content", [])
        self.assertIsNone(result)

    @patch('agent.core.evals.get_client')
    def test_api_exception_returns_none(self, mock_get_client):
        client = MagicMock()
        client.messages.create.side_effect = Exception("API down")
        mock_get_client.return_value = client
        result = run_eval("topic", "content", [])
        self.assertIsNone(result)

    @patch('agent.core.evals.get_client')
    def test_empty_sources_list_handled(self, mock_get_client):
        mock_get_client.return_value = _mock_client(VALID_JSON)
        result = run_eval("topic", "content", [])
        self.assertIsNotNone(result)

    @patch('agent.core.evals.get_client')
    def test_content_truncated_to_12000(self, mock_get_client):
        mock_get_client.return_value = _mock_client(VALID_JSON)
        long_content = "X" * 20000
        run_eval("topic", long_content, [])
        call_args = mock_get_client.return_value.messages.create.call_args
        prompt = call_args[1]['messages'][0]['content']
        # The prompt contains the content, check it doesn't include chars beyond 12000
        self.assertNotIn("X" * 12001, prompt)
