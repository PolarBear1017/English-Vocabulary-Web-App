import React from 'react';

const FlashcardFront = ({ currentReviewWord }) => {
    return (
        <h2 className="text-4xl font-bold text-gray-800">{currentReviewWord.word}</h2>
    );
};

export default FlashcardFront;
