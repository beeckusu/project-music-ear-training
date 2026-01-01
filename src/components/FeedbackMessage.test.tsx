import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import FeedbackMessage from './FeedbackMessage';

describe('FeedbackMessage', () => {
  beforeEach(() => {
    // No mocks needed for this component
  });

  it('should render message with neutral type by default', () => {
    const { getByText, container } = render(
      <FeedbackMessage message="Test message" />
    );

    expect(getByText('Test message')).toBeInTheDocument();
    const feedbackDiv = container.querySelector('.feedback-neutral');
    expect(feedbackDiv).toBeInTheDocument();
  });

  it('should render message with success type', () => {
    const { getByText, container } = render(
      <FeedbackMessage message="Success!" type="success" />
    );

    expect(getByText('Success!')).toBeInTheDocument();
    const feedbackDiv = container.querySelector('.feedback-success');
    expect(feedbackDiv).toBeInTheDocument();
  });

  it('should render message with error type', () => {
    const { getByText, container } = render(
      <FeedbackMessage message="Error occurred" type="error" />
    );

    expect(getByText('Error occurred')).toBeInTheDocument();
    const feedbackDiv = container.querySelector('.feedback-error');
    expect(feedbackDiv).toBeInTheDocument();
  });

  it('should render message with info type', () => {
    const { getByText, container } = render(
      <FeedbackMessage message="Info message" type="info" />
    );

    expect(getByText('Info message')).toBeInTheDocument();
    const feedbackDiv = container.querySelector('.feedback-info');
    expect(feedbackDiv).toBeInTheDocument();
  });

  it('should not render anything when message is empty', () => {
    const { container } = render(
      <FeedbackMessage message="" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should have correct CSS classes applied', () => {
    const { container } = render(
      <FeedbackMessage message="Test" type="success" />
    );

    const feedbackDiv = container.querySelector('.feedback-message');
    expect(feedbackDiv).toBeInTheDocument();
    expect(feedbackDiv).toHaveClass('feedback-message');
    expect(feedbackDiv).toHaveClass('feedback-success');
  });
});
