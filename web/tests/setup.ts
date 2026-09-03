import "@testing-library/jest-dom/vitest";
import * as matchers from 'vitest-axe/matchers';
import { expect } from 'vitest';

// Register vitest-axe matchers globally
expect.extend(matchers);

// Mock HTMLCanvasElement.prototype.getContext to silence jsdom canvas error
HTMLCanvasElement.prototype.getContext = () => null;