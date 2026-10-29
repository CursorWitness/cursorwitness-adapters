// Tests use a deterministic placeholder instead of requiring a developer's .env file.
// Production configuration still requires CONTRACT_IDS explicitly.
process.env.NODE_ENV ??= "test";
process.env.CONTRACT_IDS ??= "C_TEST_CONTRACT";
