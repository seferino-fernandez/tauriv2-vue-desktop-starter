# Tauri v2 Desktop Starter — task runner
# Usage: just <recipe>  |  just --list

set dotenv-load := false

# Rust project directory
rust_dir := "src-tauri"

# List available recipes
default:
    @just --list

# Prepare the development environment (safe to run repeatedly)
setup:
    #!/usr/bin/env bash
    set -euo pipefail
    command -v prek >/dev/null || { echo "missing: prek" >&2; exit 1; }
    prek update
    prek list >/dev/null
    prek install

# Install all dependencies exactly as locked
install: install-vue install-rust

# Install frontend dependencies exactly as locked
install-vue:
    pnpm install --frozen-lockfile

# Fetch Rust dependencies into the local cargo cache
install-rust:
    cd {{rust_dir}} && cargo fetch --locked

# Start Tauri dev server with hot reload
dev:
    pnpm tauri dev

# Development build
build:
    pnpm tauri build --debug

# Build the production artifact
release:
    pnpm tauri build

# Remove node_modules, dist, and Rust target artifacts
clean:
    pnpm run clean

# Lint Vue (ESLint) and Rust (clippy)
lint: lint-vue lint-rust

# Lint Vue/TS source with ESLint, fixing what can be fixed
lint-vue:
    pnpm lint:fix

# Lint Rust source with clippy, fixing what it can
lint-rust:
    cd {{rust_dir}} && cargo clippy --all-targets --all-features --fix --allow-dirty --allow-staged
    cd {{rust_dir}} && cargo clippy --all-targets --all-features -- -D warnings


# Format Vue (ESLint fix) and Rust (fmt + clippy fix)
format: format-vue format-rust

# Format Vue/TS source via ESLint auto-fix
format-vue:
    pnpm lint:fix

# Format Rust source (rustfmt + clippy auto-fix)
format-rust:
    cd {{rust_dir}} && cargo fmt --all
    cd {{rust_dir}} && cargo clippy --all-targets --all-features --fix --allow-dirty --allow-staged


# Run Vue and Rust test suites
test: test-vue test-rust

# Run Vue/TS tests via vitest
test-vue:
    pnpm test

# Run Rust tests via cargo-nextest and doc tests
test-rust:
    cd {{rust_dir}} && cargo nextest run --all-targets --all-features
    cd {{rust_dir}} && cargo test --doc


# Run TypeScript type checking
typecheck:
    pnpm typecheck

# The gate: check-mode only, mutates nothing, non-zero on any failure
verify:
    pnpm lint
    pnpm typecheck
    pnpm test
    cd {{rust_dir}} && cargo fmt --all --check
    cd {{rust_dir}} && cargo check --locked --all-targets --all-features
    cd {{rust_dir}} && cargo clippy --all-targets --all-features -- -D warnings
    cd {{rust_dir}} && cargo nextest run --all-targets --all-features
    cd {{rust_dir}} && cargo test --doc

# Scan dependencies for known vulnerabilities
audit: audit-vue audit-rust

# Scan frontend dependencies
audit-vue:
    pnpm audit

# Scan Rust dependencies
audit-rust:
    cd {{rust_dir}} && cargo audit
