import { meshyJson } from './meshy-utils.mjs';

const result = await meshyJson('/openapi/v1/balance');
console.log(`Meshy credits available: ${result.balance}`);
