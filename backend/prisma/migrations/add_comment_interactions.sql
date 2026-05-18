-- Create HelpfulVote table
CREATE TABLE IF NOT EXISTS helpfulvote (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    userId BIGINT NOT NULL,
    commentId BIGINT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT helpfulvote_userId_fkey FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE,
    CONSTRAINT helpfulvote_commentId_fkey FOREIGN KEY (commentId) REFERENCES comment(id) ON DELETE CASCADE,
    UNIQUE KEY helpfulvote_userId_commentId_key (userId, commentId)
);

-- Create CommentReport table
CREATE TABLE IF NOT EXISTS commentreport (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    userId BIGINT NOT NULL,
    commentId BIGINT NOT NULL,
    reason TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT commentreport_userId_fkey FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE,
    CONSTRAINT commentreport_commentId_fkey FOREIGN KEY (commentId) REFERENCES comment(id) ON DELETE CASCADE,
    UNIQUE KEY commentreport_userId_commentId_key (userId, commentId)
);