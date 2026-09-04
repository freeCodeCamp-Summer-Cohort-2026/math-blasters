import { describe, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { expectNoA11yViolations } from './helpers/a11y';
import { App } from '../src/App';

describe('Checking for accessibility violations', () => {
  it('app should have no accessibility violations', async () => {
    let container: HTMLElement;

    // act ensures any useEffect state updates in App settle before moving on
    await act(async () => {
      const rendered = render(<App />);
      container = rendered.container;
    });

    await expectNoA11yViolations(container!);
  });
});