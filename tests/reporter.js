export default async function* reporter(source) {
  const failures = [];
  let passed = 0;
  let failed = 0;

  for await (const event of source) {
    if (event.type === "test:pass" && event.data.details?.type !== "suite") {
      passed++;
    } else if (
      event.type === "test:fail" &&
      event.data.details?.type !== "suite"
    ) {
      failed++;
      failures.push(event.data);
    }
  }

  for (const f of failures) {
    yield `FAIL: ${f.name}\n`;
    if (f.details?.error?.message) {
      yield `  ${f.details.error.message}\n`;
    }
    yield "\n";
  }

  yield `${passed + failed} tests: ${passed} passed, ${failed} failed\n`;
}
