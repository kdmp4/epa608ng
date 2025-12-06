document.addEventListener('DOMContentLoaded', () => {
    const quizContainer = document.getElementById('quiz-container');
    const shuffleBtn = document.getElementById('shuffle-btn'); 
    const submitBtn = document.getElementById('submit-btn');
    const retryBtn = document.getElementById('retry-btn');
    const scoreDisplay = document.getElementById('score-display');
    const scoreValue = document.getElementById('score-value');
    const scoreMessage = document.getElementById('score-message');
    // Review Elements
    const reviewContainer = document.getElementById('review-container');
    const reviewList = document.getElementById('review-list');

    let questionsData = [];

    // --- Core Functions ---

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const result = [];
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            let matches = [];
            let match = regex.exec(lines[i]);
            while (match && matches.length < headers.length) {
                let val = match[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
                matches.push(val);
                match = regex.exec(lines[i]);
            }
            if (matches.length >= 6) {
                result.push({
                    id: i,
                    question: matches[0],
                    options: { A: matches[1], B: matches[2], C: matches[3], D: matches[4] },
                    answer: matches[5].toUpperCase()
                });
            }
        }
        return result;
    }

    function renderQuiz() {
        quizContainer.innerHTML = '';
        questionsData.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'question-card';
            card.dataset.id = index;

            let optionsHtml = '';
            for (const [key, value] of Object.entries(q.options)) {
                if (value) {
                    optionsHtml += `
                        <label id="label-${index}-${key}">
                            <input type="radio" name="question-${index}" value="${key}">
                            <span class="opt-text">${key}. ${value}</span>
                        </label>
                    `;
                }
            }

            card.innerHTML = `
                <div class="question-text">${index + 1}. ${q.question}</div>
                <div class="options">${optionsHtml}</div>
                <div class="feedback" id="feedback-${index}"></div>
            `;
            quizContainer.appendChild(card);
        });
    }

    // --- Initialization ---

    fetch('questions.csv')
        .then(response => response.text())
        .then(csvText => {
            questionsData = parseCSV(csvText);
            shuffleArray(questionsData);
            renderQuiz();
        })
        .catch(error => {
            console.error(error);
            quizContainer.innerHTML = '<p style="color:red;">Error loading questions.</p>';
        });


    // --- Event Listeners ---
    
    // Shuffle Button
    shuffleBtn.addEventListener('click', () => {
        document.querySelectorAll('input').forEach(i => i.checked = false);
        document.querySelectorAll('label').forEach(l => l.classList.remove('correct-answer-highlight', 'wrong-answer-highlight'));
        document.querySelectorAll('.feedback').forEach(f => f.innerHTML = '');
        scoreDisplay.classList.add('hidden');
        reviewContainer.classList.add('hidden'); // Hide review on shuffle
        
        shuffleArray(questionsData);
        renderQuiz();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Submit Button
    submitBtn.addEventListener('click', () => {
        let score = 0;
        let incorrectQuestions = []; // Array to store wrong answers for review

        questionsData.forEach((q, index) => {
            const selected = document.querySelector(`input[name="question-${index}"]:checked`);
            const feedbackDiv = document.getElementById(`feedback-${index}`);
            
            // Reset Styles
            const labels = quizContainer.children[index].querySelectorAll('label');
            labels.forEach(l => l.classList.remove('correct-answer-highlight', 'wrong-answer-highlight'));
            feedbackDiv.innerHTML = '';

            let userVal = null;
            let isCorrect = false;

            if (selected) {
                userVal = selected.value;
                if (userVal === q.answer) {
                    score++;
                    isCorrect = true;
                    document.getElementById(`label-${index}-${userVal}`).classList.add('correct-answer-highlight');
                } else {
                    document.getElementById(`label-${index}-${userVal}`).classList.add('wrong-answer-highlight');
                    const correctLabel = document.getElementById(`label-${index}-${q.answer}`);
                    if(correctLabel) correctLabel.classList.add('correct-answer-highlight');
                    feedbackDiv.innerHTML = `<span style="color: #721c24;">Incorrect. The correct answer is ${q.answer}.</span>`;
                }
            } else {
                // Not answered
                feedbackDiv.innerHTML = `<span style="color: #721c24;">Missed. The correct answer is ${q.answer}.</span>`;
                const correctLabel = document.getElementById(`label-${index}-${q.answer}`);
                if(correctLabel) correctLabel.classList.add('correct-answer-highlight');
            }

            // If incorrect or missed, add to review list
            if (!isCorrect) {
                incorrectQuestions.push({
                    question: q.question,
                    userAnswer: userVal ? `${userVal}. ${q.options[userVal]}` : "No Answer Selected",
                    correctAnswer: `${q.answer}. ${q.options[q.answer]}`
                });
            }
        });

        // 1. Show Score
        const percentage = Math.round((score / questionsData.length) * 100);
        scoreValue.textContent = percentage;
        scoreMessage.textContent = percentage >= 80 ? "Great job! You passed." : "Keep studying and try again.";
        scoreMessage.style.color = percentage >= 80 ? "green" : "red";
        
        // 2. Build Review Section
        reviewList.innerHTML = ''; // Clear previous review
        if (incorrectQuestions.length > 0) {
            reviewContainer.classList.remove('hidden');
            incorrectQuestions.forEach((item, idx) => {
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card';
                reviewCard.innerHTML = `
                    <div class="review-question">Q: ${item.question}</div>
                    <div class="review-your-answer">Your Answer: ${item.userAnswer}</div>
                    <div class="review-correct-answer">Correct Answer: ${item.correctAnswer}</div>
                `;
                reviewList.appendChild(reviewCard);
            });
        } else {
            // If 100% correct, hide review container
            reviewContainer.classList.add('hidden');
        }

        // 3. Toggle Buttons and Scroll
        scoreDisplay.classList.remove('hidden');
        submitBtn.classList.add('hidden');
        retryBtn.classList.remove('hidden');
        
        // Scroll to score display so user sees result and review section
        scoreDisplay.scrollIntoView({ behavior: 'smooth' });
    });

    // Retry Button
    retryBtn.addEventListener('click', () => {
        document.querySelectorAll('input').forEach(i => i.checked = false);
        document.querySelectorAll('label').forEach(l => l.classList.remove('correct-answer-highlight', 'wrong-answer-highlight'));
        document.querySelectorAll('.feedback').forEach(f => f.innerHTML = '');
        
        scoreDisplay.classList.add('hidden');
        reviewContainer.classList.add('hidden'); // Hide review
        
        retryBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
