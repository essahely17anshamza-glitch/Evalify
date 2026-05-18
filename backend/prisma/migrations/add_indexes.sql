-- Database indexes for optimized Community Feed and Leaderboards performance

-- Community Feed indexes
CREATE INDEX idx_projects_created_at_desc ON Project(createdAt DESC);
CREATE INDEX idx_projects_ai_score_desc ON Project(aiScore DESC);
CREATE INDEX idx_projects_views_count_desc ON Project(viewsCount DESC);
CREATE INDEX idx_projects_user_id_created_at ON Project(userId, createdAt DESC);
CREATE INDEX idx_projects_language_created_at ON Project(language, createdAt DESC) WHERE language IS NOT NULL;

-- Rating aggregation indexes
CREATE INDEX idx_ratings_project_id_score ON Rating(projectId, score);
CREATE INDEX idx_ratings_created_at ON Rating(createdAt DESC);

-- Comment indexes
CREATE INDEX idx_comments_project_id_created_at ON Comment(projectId, createdAt DESC);
CREATE INDEX idx_comments_user_id_created_at ON Comment(userId, createdAt DESC);
CREATE INDEX idx_comments_parent_id ON Comment(parentId) WHERE parentId IS NOT NULL;

-- Arena Leaderboard indexes
CREATE INDEX idx_arena_ranking_wins_desc ON ArenaRanking(wins DESC);
CREATE INDEX idx_arena_ranking_season_wins ON ArenaRanking(season, wins DESC);
CREATE INDEX idx_arena_ranking_reputation_desc ON ArenaRanking(reputation DESC);

-- Battle indexes
CREATE INDEX idx_battles_status_created_at ON Battle(status, createdAt DESC);
CREATE INDEX idx_battles_challenge_id_created_at ON Battle(challengeId, createdAt DESC);
CREATE INDEX idx_battles_player_a_id ON Battle(playerAId);
CREATE INDEX idx_battles_player_b_id ON Battle(playerBId);
CREATE INDEX idx_battles_winner_id_created_at ON Battle(winnerId, createdAt DESC) WHERE winnerId IS NOT NULL;

-- Battle Submission indexes
CREATE INDEX idx_battle_submissions_battle_id ON BattleSubmission(battleId);
CREATE INDEX idx_battle_submissions_user_id ON BattleSubmission(userId);
CREATE INDEX idx_battle_submissions_ai_score_desc ON BattleSubmission(aiScore DESC) WHERE aiScore IS NOT NULL;

-- Classroom indexes
CREATE INDEX idx_class_enrollments_class_id ON ClassEnrollment(classId);
CREATE INDEX idx_class_enrollments_student_id ON ClassEnrollment(studentId);
CREATE INDEX idx_assignments_class_id_deadline ON Assignment(classId, deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_submissions_assignment_id_student_id ON Submission(assignmentId, studentId);
CREATE INDEX idx_submissions_submitted_at_desc ON Submission(submittedAt DESC);
CREATE INDEX idx_submissions_ai_score_desc ON Submission(aiScore DESC) WHERE aiScore IS NOT NULL;

-- User Badge indexes
CREATE INDEX idx_user_badges_user_id_awarded_at ON UserBadge(userId, awardedAt DESC);
CREATE INDEX idx_user_badges_badge_id ON UserBadge(badgeId);

-- Composite indexes for common queries
CREATE INDEX idx_projects_composite_feed ON Project(createdAt DESC, aiScore DESC) WHERE aiScore IS NOT NULL;
CREATE INDEX idx_battles_composite_active ON Battle(status, createdAt DESC) WHERE status IN ('PENDING', 'ACTIVE');
CREATE INDEX idx_submissions_composite_classroom ON Submission(assignmentId, submittedAt DESC, aiScore DESC) WHERE aiScore IS NOT NULL;
