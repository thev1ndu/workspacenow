from fastmcp import Client

from .models import DiscoveredTool, DiscoverRequest, DiscoverResult

DISCOVERY_TIMEOUT_SECONDS = 20.0


async def discover(req: DiscoverRequest) -> DiscoverResult:
    # Lists an external MCP server's tools over streamable HTTP so wsn-service can register them.
    auth = req.token if req.auth != "none" and req.token else None
    async with Client(req.url, auth=auth, timeout=DISCOVERY_TIMEOUT_SECONDS) as client:
        tools = await client.list_tools()
    return DiscoverResult(tools=[DiscoveredTool(name=t.name, description=t.description or "") for t in tools])
