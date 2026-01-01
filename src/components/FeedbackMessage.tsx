import React from 'react';
import './FeedbackMessage.css';

export type FeedbackType = 'success' | 'error' | 'info' | 'neutral';

interface FeedbackMessageProps {
  message: string;
  type?: FeedbackType;
}

const FeedbackMessage: React.FC<FeedbackMessageProps> = ({
  message,
  type = 'neutral'
}) => {
  if (!message) {
    return null;
  }

  return (
    <div className={`feedback-message feedback-${type}`}>
      {message}
    </div>
  );
};

export default FeedbackMessage;
