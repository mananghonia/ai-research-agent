"""
Integration tests for the ReAct agent loop.

All Claude API calls and Tavily searches are mocked so these tests
run instantly without network access or API keys.
"""

from unittest.mock import patch, MagicMock, call
from django.test import TestCase
from agent.core.agent_loop import run_agent, SearchError


# ── Helpers ──────────────────────────────────────────────────────

def _text_block(text: str):
    block = MagicMock()
    block.type = 'text'
    block.text = text
    return block


def _tool_block(tool_id: str, query: str):
    block = MagicMock()
    block.type = 'tool_use'
    block.name = 'tavily_search'
    block.id = tool_id
    block.input = {'query': query}
    return block


def _response(stop_reason: str, *content_blocks):
    r = MagicMock()
    r.stop_reason = stop_reason
    r.content = list(content_blocks)
    return r


SAMPLE_REPORT = (
    "## Executive Summary\nThis is a thorough report.\n\n"
    "## Key Findings\nMany findings here.\n\n"
    "## Detailed Analysis\n" + "Analysis text. " * 20 + "\n\n"
    "## Conclusion\nDone."
)

SAMPLE_SOURCES = [
    {'url': 'https://example.com', 'title': 'Example', 'content': 'Some content'}
]


# ── Tests ─────────────────────────────────────────────────────────

class AgentLoopDirectReportTests(TestCase):
    """Agent finishes in one turn without calling any tools."""

    @patch('agent.core.agent_loop.get_client')
    def test_yields_report_on_end_turn(self, mock_get_client):
        client = MagicMock()
        mock_get_client.return_value = client
        client.messages.create.return_value = _response('end_turn', _text_block(SAMPLE_REPORT))

        steps = list(run_agent("quantum computing"))

        report_steps = [s for s in steps if s['type'] == 'report']
        self.assertEqual(len(report_steps), 1)
        self.assertIn('Executive Summary', report_steps[0]['content'])

    @patch('agent.core.agent_loop.get_client')
    def test_no_search_steps_when_no_tools_used(self, mock_get_client):
        client = MagicMock()
        mock_get_client.return_value = client
        client.messages.create.return_value = _response('end_turn', _text_block(SAMPLE_REPORT))

        steps = list(run_agent("quantum computing"))

        self.assertEqual([s for s in steps if s['type'] == 'search'], [])
        self.assertEqual([s for s in steps if s['type'] == 'read'], [])


class AgentLoopToolUseTests(TestCase):
    """Agent calls tavily_search before writing the report."""

    @patch('agent.core.agent_loop.execute_tavily_search')
    @patch('agent.core.agent_loop.get_client')
    def test_search_then_report(self, mock_get_client, mock_search):
        client = MagicMock()
        mock_get_client.return_value = client
        mock_search.return_value = SAMPLE_SOURCES

        tool_resp   = _response('tool_use', _tool_block('t1', 'quantum computing basics'))
        report_resp = _response('end_turn', _text_block(SAMPLE_REPORT))
        client.messages.create.side_effect = [tool_resp, report_resp]

        steps = list(run_agent("quantum computing"))

        search_steps = [s for s in steps if s['type'] == 'search']
        read_steps   = [s for s in steps if s['type'] == 'read']
        report_steps = [s for s in steps if s['type'] == 'report']

        self.assertEqual(len(search_steps), 1)
        self.assertEqual(search_steps[0]['query'], 'quantum computing basics')
        self.assertEqual(len(read_steps), 1)
        self.assertEqual(len(report_steps), 1)

    @patch('agent.core.agent_loop.execute_tavily_search')
    @patch('agent.core.agent_loop.get_client')
    def test_sources_collected_from_read_steps(self, mock_get_client, mock_search):
        client = MagicMock()
        mock_get_client.return_value = client
        mock_search.return_value = SAMPLE_SOURCES

        tool_resp   = _response('tool_use', _tool_block('t1', 'test query'))
        report_resp = _response('end_turn', _text_block(SAMPLE_REPORT))
        client.messages.create.side_effect = [tool_resp, report_resp]

        steps = list(run_agent("test topic"))

        report = next(s for s in steps if s['type'] == 'report')
        self.assertIn('https://example.com', [s['url'] for s in report['sources']])

    @patch('agent.core.agent_loop.execute_tavily_search')
    @patch('agent.core.agent_loop.get_client')
    def test_deduplicates_sources_across_searches(self, mock_get_client, mock_search):
        client = MagicMock()
        mock_get_client.return_value = client
        # Both searches return the same URL
        mock_search.return_value = SAMPLE_SOURCES

        tool_resp1  = _response('tool_use', _tool_block('t1', 'query one'))
        tool_resp2  = _response('tool_use', _tool_block('t2', 'query two'))
        report_resp = _response('end_turn', _text_block(SAMPLE_REPORT))
        client.messages.create.side_effect = [tool_resp1, tool_resp2, report_resp]

        steps = list(run_agent("test topic"))
        report = next(s for s in steps if s['type'] == 'report')

        urls = [s['url'] for s in report['sources']]
        self.assertEqual(len(urls), len(set(urls)), "Duplicate sources should be deduplicated")


class AgentLoopSearchFailureTests(TestCase):
    """Agent recovers when Tavily search fails."""

    @patch('agent.core.agent_loop.execute_tavily_search')
    @patch('agent.core.agent_loop.get_client')
    def test_search_failure_yields_think_step(self, mock_get_client, mock_search):
        client = MagicMock()
        mock_get_client.return_value = client
        mock_search.side_effect = Exception("Tavily connection error")

        tool_resp   = _response('tool_use', _tool_block('t1', 'failing query'))
        report_resp = _response('end_turn', _text_block(SAMPLE_REPORT))
        client.messages.create.side_effect = [tool_resp, report_resp]

        steps = list(run_agent("test topic"))

        think_steps = [s for s in steps if s['type'] == 'think']
        self.assertTrue(any('failed' in s['message'].lower() for s in think_steps))

    @patch('agent.core.agent_loop.execute_tavily_search')
    @patch('agent.core.agent_loop.get_client')
    def test_agent_continues_after_search_failure(self, mock_get_client, mock_search):
        client = MagicMock()
        mock_get_client.return_value = client
        mock_search.side_effect = Exception("Tavily down")

        tool_resp   = _response('tool_use', _tool_block('t1', 'query'))
        report_resp = _response('end_turn', _text_block(SAMPLE_REPORT))
        client.messages.create.side_effect = [tool_resp, report_resp]

        steps = list(run_agent("test topic"))

        # Agent must still produce a report despite the search failure
        report_steps = [s for s in steps if s['type'] == 'report']
        self.assertEqual(len(report_steps), 1)

    @patch('agent.core.agent_loop.execute_tavily_search')
    @patch('agent.core.agent_loop.get_client')
    def test_is_error_sent_to_claude_on_search_failure(self, mock_get_client, mock_search):
        """Claude should receive is_error=True in tool_result when search fails."""
        client = MagicMock()
        mock_get_client.return_value = client
        mock_search.side_effect = Exception("network error")

        tool_resp   = _response('tool_use', _tool_block('t1', 'query'))
        report_resp = _response('end_turn', _text_block(SAMPLE_REPORT))
        client.messages.create.side_effect = [tool_resp, report_resp]

        list(run_agent("test topic"))

        # Second call to messages.create should include is_error:True in user content.
        # The messages list is [initial_user_msg, assistant_msg, tool_results_user_msg].
        # The LAST user message is the tool results — earlier user messages contain plain strings.
        second_call_messages = client.messages.create.call_args_list[1][1]['messages']
        user_messages = [m for m in second_call_messages if m['role'] == 'user']
        tool_results_msg = user_messages[-1]  # last user msg = tool results
        tool_result_content = tool_results_msg['content']
        self.assertIsInstance(tool_result_content, list)
        self.assertTrue(
            any(isinstance(tr, dict) and tr.get('is_error') for tr in tool_result_content),
            "is_error should be True in tool result when search fails"
        )


class AgentLoopClaudeErrorTests(TestCase):
    """Agent handles Claude API errors gracefully."""

    @patch('agent.core.agent_loop.get_client')
    def test_api_error_yields_error_step(self, mock_get_client):
        import anthropic as ant
        client = MagicMock()
        mock_get_client.return_value = client
        client.messages.create.side_effect = ant.APIError(
            message="Overloaded", request=MagicMock(), body={}
        )

        steps = list(run_agent("test topic"))

        error_steps = [s for s in steps if s['type'] == 'error']
        self.assertGreater(len(error_steps), 0)
        self.assertTrue(any('claude' in s['message'].lower() or 'api' in s['message'].lower()
                            for s in error_steps))
