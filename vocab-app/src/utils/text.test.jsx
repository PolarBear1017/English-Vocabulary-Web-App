import { describe, expect, it } from 'vitest';
import React from 'react';
import { highlightWord, highlightWithCollocation, renderClozeWithCollocation } from './text';

describe('highlightWord and highlightWithCollocation', () => {
  it('highlights target word in text', () => {
    const result = highlightWord('Work is sheer hell at the moment.', 'hell');
    expect(Array.isArray(result)).toBe(true);
    const highlightedNode = result.find(
      (node) => React.isValidElement(node) && node.props?.className?.includes('text-blue-600')
    );
    expect(highlightedNode).toBeDefined();
    expect(highlightedNode.props.children).toBe('hell');
  });

  it('highlights collocation and target word within collocation', () => {
    const result = highlightWithCollocation(
      'Work is sheer hell at the moment.',
      'hell',
      'sheer hell'
    );
    expect(Array.isArray(result)).toBe(true);

    const collocNode = result.find(
      (node) => React.isValidElement(node) && node.props?.title?.includes('常用搭配: sheer hell')
    );
    expect(collocNode).toBeDefined();
    expect(collocNode.props.className).toContain('border-amber-400');

    // Children inside collocation should contain the highlighted word
    const children = collocNode.props.children;
    expect(Array.isArray(children)).toBe(true);
    const innerHighlighted = children.find(
      (node) => React.isValidElement(node) && node.props?.className?.includes('text-blue-600')
    );
    expect(innerHighlighted).toBeDefined();
    expect(innerHighlighted.props.children).toBe('hell');
  });

  it('falls back to highlightWord if collocation is not provided', () => {
    const result = highlightWithCollocation(
      'Work is sheer hell at the moment.',
      'hell',
      ''
    );
    const hasColloc = result.some(
      (node) => React.isValidElement(node) && node.props?.title?.includes('常用搭配')
    );
    expect(hasColloc).toBe(false);

    const highlightedNode = result.find(
      (node) => React.isValidElement(node) && node.props?.className?.includes('text-blue-600')
    );
    expect(highlightedNode).toBeDefined();
    expect(highlightedNode.props.children).toBe('hell');
  });
});

describe('renderClozeWithCollocation', () => {
  it('renders masked collocation block in cloze sentence', () => {
    const result = renderClozeWithCollocation(
      'Work is sheer hell at the moment.',
      'hell',
      'sheer hell'
    );
    expect(Array.isArray(result)).toBe(true);

    const collocNode = result.find(
      (node) => React.isValidElement(node) && node.props?.title?.includes('搭配詞組合: sheer hell')
    );
    expect(collocNode).toBeDefined();
    expect(collocNode.props.children).toBe('sheer ________');
  });

  it('falls back to standard cloze string if collocation is not provided', () => {
    const result = renderClozeWithCollocation(
      'Work is sheer hell at the moment.',
      'hell',
      null
    );
    expect(typeof result).toBe('string');
    expect(result).toBe('Work is sheer ________ at the moment.');
  });
});
