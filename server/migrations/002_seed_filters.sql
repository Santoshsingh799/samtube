-- SamTube filter registry seed — topic taxonomy from the product spec (§3 A–I).
-- Idempotent: safe to re-run.

INSERT INTO filter_categories (id, label, description, sort, kind) VALUES
  ('education',            'Education',                 'Classes, degrees, branches, exam prep', 10, 'topic'),
  ('technology',           'Technology & CS',           'Programming, AI/ML, web, systems',      20, 'topic'),
  ('trading-finance',      'Trading & Finance',         'Markets, analysis, strategies',         30, 'topic'),
  ('psychology',           'Psychology',                'Mind, behavior, communication',         40, 'topic'),
  ('movies-entertainment', 'Movies & Entertainment',    'Cinema, shows, genres',                 50, 'topic'),
  ('mythology-spiritual',  'Mythology & Spiritual',     'Mahabharat, Ramayan, Gita, Puranas',    60, 'topic'),
  ('science-knowledge',    'Science & Knowledge',       'Physics, chemistry, math, history...',  70, 'topic'),
  ('lifestyle',            'Lifestyle & Others',        'Fitness, cooking, sports, business',    80, 'topic'),
  ('general-video',        'General Video Filters',     'Duration, language, resolution, type',  90, 'utility')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, sort = EXCLUDED.sort, kind = EXCLUDED.kind, active = true;

WITH seed(category_id, label, sort) AS (
  VALUES
  -- §3 A. Education Filters
  ('education','Class 1',1),('education','Class 2',2),('education','Class 3',3),('education','Class 4',4),('education','Class 5',5),('education','Class 6',6),('education','Class 7',7),('education','Class 8',8),('education','Class 9',9),('education','Class 10',10),('education','Class 11',11),('education','Class 12',12),
  ('education','Diploma',20),('education','B.Tech',21),('education','BCA',22),('education','MCA',23),('education','B.Sc',24),('education','M.Sc',25),('education','MBA',26),
  ('education','Undergraduate',30),('education','Postgraduate',31),('education','PhD',32),
  ('education','University',40),('education','College',41),('education','Degree',42),('education','Branch',43),('education','Semester',44),('education','Subject',45),('education','Module',46),('education','Unit',47),('education','Chapter',48),('education','Topic',49),
  ('education','Exam Preparation',60),('education','Practical',61),('education','Lab',62),('education','Viva',63),('education','Assignment',64),('education','Placement Preparation',65),
  -- §3 B. Technology Filters
  ('technology','Computer Science',1),('technology','Artificial Intelligence',2),('technology','Machine Learning',3),('technology','Deep Learning',4),('technology','Data Science',5),('technology','Data Analytics',6),
  ('technology','Python',10),('technology','Java',11),('technology','C++',12),('technology','JavaScript',13),('technology','React',14),('technology','Node.js',15),
  ('technology','Web Development',20),('technology','App Development',21),('technology','Cybersecurity',22),('technology','Ethical Hacking',23),('technology','Cloud Computing',24),('technology','DevOps',25),
  ('technology','Blockchain',30),('technology','IoT',31),('technology','Robotics',32),('technology','Computer Vision',33),('technology','NLP',34),('technology','Neural Networks',35),
  ('technology','Generative AI',40),('technology','LLMs',41),('technology','System Design',42),('technology','DSA',43),('technology','Competitive Programming',44),
  -- §3 C. Trading & Finance Filters
  ('trading-finance','Forex',1),('trading-finance','XAUUSD',2),('trading-finance','EURUSD',3),('trading-finance','GBPUSD',4),('trading-finance','BTCUSDT',5),('trading-finance','Cryptocurrency',6),
  ('trading-finance','Indian Stock Market',10),('trading-finance','NIFTY',11),('trading-finance','BANKNIFTY',12),('trading-finance','Options Trading',13),('trading-finance','Futures',14),('trading-finance','Long-term Investing',15),
  ('trading-finance','Day Trading',20),('trading-finance','Scalping',21),('trading-finance','Swing Trading',22),('trading-finance','Price Action',23),('trading-finance','Market Structure',24),('trading-finance','Liquidity Sweep',25),
  ('trading-finance','Order Blocks',30),('trading-finance','Fair Value Gaps',31),('trading-finance','Supply and Demand',32),('trading-finance','Smart Money Concepts',33),
  ('trading-finance','Technical Analysis',40),('trading-finance','Fundamental Analysis',41),('trading-finance','Risk Management',42),('trading-finance','Trading Psychology',43),('trading-finance','Backtesting',44),
  ('trading-finance','Trading Bots',50),('trading-finance','MT4',51),('trading-finance','MT5',52),('trading-finance','TradingView',53),
  -- §3 D. Psychology Filters
  ('psychology','Cognitive Psychology',1),('psychology','Behavioral Psychology',2),('psychology','Social Psychology',3),('psychology','Clinical Psychology',4),('psychology','Developmental Psychology',5),('psychology','Personality Psychology',6),
  ('psychology','Neuroscience',10),('psychology','Human Behavior',11),('psychology','Memory',12),('psychology','Learning',13),('psychology','Decision Making',14),
  ('psychology','Emotional Intelligence',20),('psychology','Communication',21),('psychology','Body Language',22),('psychology','Social Behavior',23),('psychology','Research Psychology',24),
  -- §3 E. Movies & Entertainment Filters
  ('movies-entertainment','Bollywood',1),('movies-entertainment','Hollywood',2),('movies-entertainment','Tollywood',3),('movies-entertainment','South Indian Cinema',4),('movies-entertainment','Indian Cinema',5),('movies-entertainment','International Cinema',6),
  ('movies-entertainment','Movies',10),('movies-entertainment','Movie Trailers',11),('movies-entertainment','Movie Reviews',12),('movies-entertainment','Movie Explained',13),('movies-entertainment','Web Series',14),('movies-entertainment','TV Shows',15),('movies-entertainment','Short Films',16),
  ('movies-entertainment','Animation',20),('movies-entertainment','Anime',21),('movies-entertainment','Cartoons',22),
  ('movies-entertainment','Comedy',30),('movies-entertainment','Action',31),('movies-entertainment','Adventure',32),('movies-entertainment','Horror',33),('movies-entertainment','Thriller',34),('movies-entertainment','Romance',35),('movies-entertainment','Science Fiction',36),('movies-entertainment','Fantasy',37),('movies-entertainment','Mystery',38),('movies-entertainment','Crime',39),('movies-entertainment','Drama',40),
  ('movies-entertainment','Documentary',50),('movies-entertainment','Behind the Scenes',51),('movies-entertainment','Interviews',52),('movies-entertainment','Film Making',53),('movies-entertainment','Cinematography',54),
  -- §3 F. Mythology & Spiritual Content
  ('mythology-spiritual','Mahabharat',1),('mythology-spiritual','Ramayan',2),('mythology-spiritual','Krishna Leela',3),('mythology-spiritual','Shiv Puran',4),('mythology-spiritual','Vishnu Puran',5),('mythology-spiritual','Bhagavad Gita',6),
  ('mythology-spiritual','Vedic Knowledge',10),('mythology-spiritual','Indian Mythology',11),('mythology-spiritual','World Mythology',12),('mythology-spiritual','Ancient Civilizations',13),
  ('mythology-spiritual','Historical Stories',20),('mythology-spiritual','Religious Lectures',21),('mythology-spiritual','Mythological TV Shows',22),('mythology-spiritual','Mythological Episodes',23),('mythology-spiritual','Historical Documentaries',24),
  -- §3 G. Science & Knowledge
  ('science-knowledge','Physics',1),('science-knowledge','Chemistry',2),('science-knowledge','Biology',3),('science-knowledge','Mathematics',4),('science-knowledge','Astronomy',5),('science-knowledge','Space Science',6),('science-knowledge','Quantum Physics',7),
  ('science-knowledge','Geography',10),('science-knowledge','Environment',11),('science-knowledge','Technology',12),('science-knowledge','Philosophy',13),('science-knowledge','History',14),('science-knowledge','Economics',15),('science-knowledge','Politics',16),
  ('science-knowledge','General Knowledge',20),('science-knowledge','Research',21),('science-knowledge','Experiments',22),
  -- §3 H. Lifestyle & Other Categories
  ('lifestyle','Fitness',1),('lifestyle','Gym',2),('lifestyle','Nutrition',3),('lifestyle','Cooking',4),('lifestyle','Travel',5),('lifestyle','Fashion',6),('lifestyle','Beauty',7),('lifestyle','Music',8),
  ('lifestyle','Sports',10),('lifestyle','Football',11),('lifestyle','Cricket',12),('lifestyle','Gaming',13),
  ('lifestyle','Business',20),('lifestyle','Entrepreneurship',21),('lifestyle','Marketing',22),('lifestyle','Personal Finance',23),('lifestyle','Career',24),('lifestyle','Motivation',25),
  ('lifestyle','News',30),('lifestyle','Podcasts',31),('lifestyle','Interviews',32),('lifestyle','Tutorials',33)
)
INSERT INTO filter_definitions (id, category_id, label, sort)
SELECT
  trim(both '-' from regexp_replace(lower(category_id || ':' || label), '[^a-z0-9]+', '-', 'g')),
  category_id,
  label,
  sort
FROM seed
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort = EXCLUDED.sort, active = true;
