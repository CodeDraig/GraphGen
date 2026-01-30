import networkx as nx

from graphgen.models.storage.networkx_storage import NetworkXStorage


def test_stable_largest_connected_component_undirected():
    graph = nx.Graph()
    graph.add_edge("a", "b")
    graph.add_edge("c", "d")
    graph.add_node("e")  # isolated node should be ignored

    lcc = NetworkXStorage.stable_largest_connected_component(graph)

    assert set(lcc.nodes) == {"A", "B"}
    assert lcc.number_of_edges() == 1


def test_stable_largest_connected_component_directed():
    graph = nx.DiGraph()
    graph.add_edge("a", "b")
    graph.add_edge("b", "a")
    graph.add_edge("c", "d")  # not strongly connected with the first component

    lcc = NetworkXStorage.stable_largest_connected_component(graph)

    assert set(lcc.nodes) == {"A", "B"}
    assert lcc.is_directed()
