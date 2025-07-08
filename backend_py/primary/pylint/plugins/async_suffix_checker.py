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
        # Skip core Python magic/dunder methods
        is_special_method = node.name.startswith("__") and node.name.endswith("__")

        # Skip fast-api endpoints
        has_router_decorator = FAST_API_ROUTER_DECORATOR in node.decoratornames()

        if not node.name.endswith("_async") and not has_router_decorator and not is_special_method:
            self.add_message("C9001", node=node, args=(node.name,))


def register(linter: PyLinter) -> None:
    linter.register_checker(AsyncSuffixChecker(linter))
