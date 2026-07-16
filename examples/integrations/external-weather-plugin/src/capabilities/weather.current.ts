import { CapabilityBuilder } from '@beehive/sdk';
import type { CapabilityResult, ExecutionContext } from '@beehive/sdk';

const MOCK_WEATHER: Record<string, { temp: number; condition: string; humidity: number }> = {
  'sao paulo': { temp: 28, condition: 'parcialmente nublado', humidity: 65 },
  'rio de janeiro': { temp: 32, condition: 'ensolarado', humidity: 70 },
  'nova york': { temp: 12, condition: 'nublado', humidity: 55 },
  'londres': { temp: 8, condition: 'chuva leve', humidity: 80 },
  'toquio': { temp: 18, condition: 'ensolarado', humidity: 45 },
};

export const weatherCapability = CapabilityBuilder.create('weather.current', 'Current Weather')
  .describe('Obtem temperatura e condicoes climaticas atuais para uma cidade')
  .addInput({ name: 'city', type: 'string', required: true, description: 'Nome da cidade' })
  .addOutput({ name: 'temperature', type: 'number', description: 'Temperatura atual em Celsius' })
  .addOutput({ name: 'condition', type: 'string', description: 'Condicao climatica' })
  .addOutput({ name: 'humidity', type: 'number', description: 'Umidade relativa do ar' })
  .withTags('weather', 'external')
  .withVersion('1.0.0')
  .handle(async (input, _ctx: ExecutionContext): Promise<CapabilityResult> => {
    const city = (input.city as string || '').toLowerCase().trim();
    const weather = MOCK_WEATHER[city];

    if (!weather) {
      return {
        success: true,
        outputs: {
          temperature: 22,
          condition: 'dados nao disponiveis para esta cidade',
          humidity: 50,
        },
        metrics: { duration: 0 },
      };
    }

    return {
      success: true,
      outputs: {
        temperature: weather.temp,
        condition: weather.condition,
        humidity: weather.humidity,
      },
      metrics: { duration: 0 },
    };
  })
  .build();
