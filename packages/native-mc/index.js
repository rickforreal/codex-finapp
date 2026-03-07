'use strict';

const fs = require('node:fs');
const path = require('node:path');

let nativeBinding = null;

const resolveBindingPath = () => {
  const candidates = [
    path.join(__dirname, 'index.node'),
    path.join(__dirname, 'native', `${process.platform}-${process.arch}`, 'index.node'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Native Monte Carlo binding not found for ${process.platform}-${process.arch}. Run \"npm run build -w @finapp/native-mc\" with Rust toolchain installed.`,
  );
};

const loadBinding = () => {
  if (nativeBinding) {
    return nativeBinding;
  }
  const bindingPath = resolveBindingPath();
  nativeBinding = require(bindingPath);
  return nativeBinding;
};

const runMonteCarloJson = (request) => {
  const binding = loadBinding();
  if (!binding || typeof binding.runMonteCarloJson !== 'function') {
    throw new Error('Native Monte Carlo binding missing runMonteCarloJson export');
  }
  return binding.runMonteCarloJson(request);
};

const runSinglePathJson = (request) => {
  const binding = loadBinding();
  if (!binding || typeof binding.runSinglePathJson !== 'function') {
    throw new Error('Native Monte Carlo binding missing runSinglePathJson export');
  }
  return binding.runSinglePathJson(request);
};

const runReforecastJson = (request) => {
  const binding = loadBinding();
  if (!binding || typeof binding.runReforecastJson !== 'function') {
    throw new Error('Native Monte Carlo binding missing runReforecastJson export');
  }
  return binding.runReforecastJson(request);
};

module.exports = {
  runMonteCarloJson,
  runSinglePathJson,
  runReforecastJson,
};
