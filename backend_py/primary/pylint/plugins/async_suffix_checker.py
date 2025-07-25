from astroid import nodes

from pylint.checkers import BaseChecker
from pylint.interfaces import IAstroidChecker
from pylint.lint import PyLinter


# We dont want to enforce the _async suffix on our router methods
FAST_API_ROUTER_DECORATOR = "fastapi.routing.APIRouter.api_route.decorator"


class AsyncSuffixChecker(BaseChecker):
    __implements__ = IAstroidChecker

    name = "async-suffix"
    msgs = {
        "C9001": (
            'Async method name "%s" should end with "_async"',
            "async-suffix",
            'Ensure that all async method names end with "_async".',
        ),
    }

    def visit_asyncfunctiondef(self, node: nodes.AsyncFunctionDef) -> None:
        if node.name.endswith("_async"):
            return

        # Skip core Python magic/dunder methods
        if node.name.startswith("__") and node.name.endswith("__"):
            return

        # Skip fast-api endpoints
        if FAST_API_ROUTER_DECORATOR in node.decoratornames():
            return

        # Add warning to function
        self.add_message("C9001", node=node, args=(node.name,))


def register(linter: PyLinter) -> None:
    linter.register_checker(AsyncSuffixChecker(linter))
