# Submission Form Answers

## Project Name & One-Line Description

X Layer Trust Leases — A pre-execution lease layer for X Layer agents that bounds wallet scope, budget, protocol, counterparty, and expiry before autonomous execution is allowed.

## Project Highlights

X Layer Trust Leases is not another trading bot. It is a human-track primitive for bounded agent authority.

A human issues a lease. The lease defines wallet scope, allowed assets, allowed protocols, allowed counterparties, per-tx limits, daily budget, and expiry. The agent submits a request against that lease. Only requests that stay inside the lease envelope can execute.

The project already reuses a live X Layer Agentic Wallet execution path from existing workspace projects, writes explicit receipts for every round, and renders a judge-facing proof dashboard and submission page. The current proof set already includes a real X Layer transaction broadcasted through a lease-approved path.

## Your Track

X Layer Arena

## Team Members & Contact Information

Richard — builder — ritsuyan4763@gmail.com

## Agentic Wallet Address

0xdbc8e35ea466f85d57c0cc1517a81199b8549f04

## GitHub Repository Link

https://github.com/richard7463/xlayer-trust-leases

## OnchainOS Usage

This project uses the same OnchainOS-backed X Layer execution path already proven in local live projects in this workspace.

- OnchainOS wallet balance lookup for treasury state
- OnchainOS swap quote for route viability
- OnchainOS swap execute for live X Layer execution when the lease approves the request
- X Layer tx hash and explorer-linked receipt as proof output

The lease is the pre-execution gate sitting above that path.

## Demo Video Link

Fill after upload.

## X Post Link

Fill after posting.
