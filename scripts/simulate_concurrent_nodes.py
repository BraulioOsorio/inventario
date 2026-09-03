#!/usr/bin/env python3
"""
Simulación de arquitectura distribuida — Inventario Modular
Unidad 2 · Arquitectura de Software · Tecnológica del Oriente

Simula nodos de red y hilos de trabajo que procesan movimientos de inventario
de forma concurrente, con métricas de tiempo y consistencia.
"""
from __future__ import annotations

import argparse
import json
import statistics
import threading
import time
from dataclasses import dataclass, field
from http.client import HTTPConnection, HTTPSConnection
from typing import Any
from urllib.parse import urlparse


@dataclass
class StockState:
    product_id: str
    quantity: int
    lock: threading.Lock = field(default_factory=threading.Lock)


class InMemoryInventoryNode:
    """Nodo simulado que procesa movimientos con bloqueo por producto (robustez)."""

    def __init__(self, node_id: str, initial_stock: int = 100):
        self.node_id = node_id
        self.state = StockState(product_id="demo-product", quantity=initial_stock)
        self.processed = 0
        self.rejected = 0

    def register_out(self, qty: int) -> dict[str, Any]:
        with self.state.lock:
            if self.state.quantity < qty:
                self.rejected += 1
                return {"node": self.node_id, "ok": False, "reason": "stock_insuficiente"}
            self.state.quantity -= qty
            self.processed += 1
            return {
                "node": self.node_id,
                "ok": True,
                "remaining": self.state.quantity,
                "qty": qty,
            }


def worker(node: InMemoryInventoryNode, iterations: int, qty: int, latencies: list[float]) -> None:
    for _ in range(iterations):
        start = time.perf_counter()
        node.register_out(qty)
        latencies.append((time.perf_counter() - start) * 1000)


def run_local_simulation(threads: int, iterations: int, qty: int) -> dict[str, Any]:
    node = InMemoryInventoryNode("nodo-api-1", initial_stock=threads * iterations * qty)
    latencies: list[float] = []
    workers = [
        threading.Thread(target=worker, args=(node, iterations, qty, latencies))
        for _ in range(threads)
    ]
    t0 = time.perf_counter()
    for w in workers:
        w.start()
    for w in workers:
        w.join()
    elapsed = (time.perf_counter() - t0) * 1000
    return {
        "mode": "local_threads",
        "threads": threads,
        "iterations_per_thread": iterations,
        "processed": node.processed,
        "rejected": node.rejected,
        "final_stock": node.state.quantity,
        "total_ms": round(elapsed, 2),
        "avg_latency_ms": round(statistics.mean(latencies), 3) if latencies else 0,
        "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95) - 1], 3) if latencies else 0,
        "throughput_ops_s": round((node.processed + node.rejected) / (elapsed / 1000), 2) if elapsed else 0,
    }


def _connection_for(url: str):
    parsed = urlparse(url)
    if parsed.scheme == "https":
        return HTTPSConnection(parsed.hostname, parsed.port or 443, timeout=15)
    return HTTPConnection(parsed.hostname, parsed.port or 80, timeout=15)


def run_api_health_check(base_url: str) -> dict[str, Any]:
    parsed = urlparse(base_url.rstrip("/"))
    path = "/health"
    conn = _connection_for(base_url)
    start = time.perf_counter()
    try:
        conn.request("GET", path)
        res = conn.getresponse()
        body = res.read().decode("utf-8", errors="replace")
        elapsed = (time.perf_counter() - start) * 1000
        return {
            "endpoint": f"{base_url}{path}",
            "status": res.status,
            "latency_ms": round(elapsed, 2),
            "body_preview": body[:200],
        }
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulación distribuida Inventario Modular")
    parser.add_argument("--threads", type=int, default=8, help="Hilos concurrentes")
    parser.add_argument("--iterations", type=int, default=25, help="Operaciones por hilo")
    parser.add_argument("--qty", type=int, default=1, help="Cantidad por movimiento de salida")
    parser.add_argument("--api-url", type=str, default="", help="URL base API para health check")
    parser.add_argument("--json-out", type=str, default="", help="Guardar resultados en JSON")
    args = parser.parse_args()

    print("=" * 60)
    print("SIMULACIÓN — Red distribuida de inventario")
    print("=" * 60)

    local = run_local_simulation(args.threads, args.iterations, args.qty)
    print(f"\n[Nodos simulados] 1 nodo API con {local['threads']} hilos de trabajo")
    print(f"  Operaciones procesadas : {local['processed']}")
    print(f"  Operaciones rechazadas : {local['rejected']}")
    print(f"  Stock final          : {local['final_stock']}")
    print(f"  Tiempo total         : {local['total_ms']} ms")
    print(f"  Latencia promedio    : {local['avg_latency_ms']} ms")
    print(f"  Latencia P95         : {local['p95_latency_ms']} ms")
    print(f"  Throughput           : {local['throughput_ops_s']} ops/s")

    results: dict[str, Any] = {"local_simulation": local}

    if args.api_url:
        print(f"\n[Health check] {args.api_url}")
        health = run_api_health_check(args.api_url)
        print(f"  HTTP {health['status']} — {health['latency_ms']} ms")
        results["api_health"] = health

    print("\n" + "=" * 60)
    print("Simulación finalizada. Use estas métricas en el informe y el video.")
    print("=" * 60)

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"Resultados guardados en: {args.json_out}")


if __name__ == "__main__":
    main()
