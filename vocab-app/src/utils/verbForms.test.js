import { describe, expect, it } from 'vitest';
import { getVerbForms } from './verbForms';

describe('getVerbForms', () => {
  it('returns null for empty or invalid input', () => {
    expect(getVerbForms('')).toBeNull();
    expect(getVerbForms(null)).toBeNull();
    expect(getVerbForms('apple')).toBeNull();
  });

  it('correctly conjugates regular verbs', () => {
    const produceForms = getVerbForms('produce');
    expect(produceForms).toEqual({
      present: 'produce',
      past: 'produced',
      pastParticiple: 'produced'
    });

    const createForms = getVerbForms('create');
    expect(createForms).toEqual({
      present: 'create',
      past: 'created',
      pastParticiple: 'created'
    });
  });

  it('correctly handles irregular verbs', () => {
    const eatForms = getVerbForms('eat');
    expect(eatForms).toEqual({
      present: 'eat',
      past: 'ate',
      pastParticiple: 'eaten'
    });

    const goForms = getVerbForms('go');
    expect(goForms).toEqual({
      present: 'go',
      past: 'went',
      pastParticiple: 'gone'
    });

    const runForms = getVerbForms('run');
    expect(runForms).toEqual({
      present: 'run',
      past: 'ran',
      pastParticiple: 'run'
    });
  });

  it('can resolve base forms when passed past tense words', () => {
    const fromAte = getVerbForms('ate');
    expect(fromAte).toEqual({
      present: 'eat',
      past: 'ate',
      pastParticiple: 'eaten'
    });
  });
});
