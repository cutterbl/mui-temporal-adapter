// Registers @testing-library/jest-dom's matchers (`toBeInTheDocument()`, `toHaveValue()`, …)
// onto Vitest's `expect` for the `component` project. Imported for its side effect only —
// via its `/vitest` entry point specifically, since this project uses Vitest, not Jest.
import '@testing-library/jest-dom/vitest';
