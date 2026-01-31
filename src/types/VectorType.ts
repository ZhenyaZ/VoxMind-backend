import { EntityProperty, Platform, Type } from '@mikro-orm/core';

export class VectorType extends Type<number[] | string, string> {
  convertToDatabaseValue(value: number[] | string, platform: Platform): string {
    if (Array.isArray(value)) {
      return `[${value.join(',')}]`;
    }
    return value as string;
  }

  convertToJSValue(value: string, platform: Platform): number[] {
    if (!value) return [];
    return value
      .replace(/[\[\]]/g, '')
      .split(',')
      .map(Number);
  }

  getColumnType(prop: EntityProperty, platform: Platform) {
    return `vector(1536)`;
  }
}
