import { axe } from 'vitest-axe';
import { expect } from 'vitest';

export const expectNoA11yViolations = async (container: HTMLElement) => {
  const results = await axe(container);
  // @ts-expect-error TypeScript doesn't know about that it is added by vitest-axe, apparently its a known issue with vitest-axe
  expect(results).toHaveNoViolations();
};