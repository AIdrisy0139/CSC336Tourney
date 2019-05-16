const port = 8080;
const path = require('path');
const bodyParser = require('body-parser');
const exphb = require('express-handlebars');
const express = require('express');
const mysql = require('mysql');
const app = express();

app.engine('handlebars', exphb({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, '/public'))); // Access css file

// Set database connection credentials
const client = mysql.createConnection({
  host:   '127.0.0.1',
  user: 'root',
  password: 'password',
  port: 3306
});

// Connect to the database
client.connect((err) => {
  if (err) {
    console.log('Connection error', err.stack);
  } else {
    console.log("Database connected!");
  }
});

const dropDatabase = `DROP DATABASE IF EXISTS tournamentDatabase;`;
const createDatabase = `CREATE DATABASE IF NOT EXISTS tournamentDatabase;`;
const useDatabase = `USE tournamentDatabase;`;
const changeConfig = `SET GLOBAL log_bin_trust_function_creators = 1;`;

// Create tables
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users(
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL DEFAULT 'password'
);`;
const createProfilesTable = `
CREATE TABLE IF NOT EXISTS profiles(
  user_id INT,
  display_name VARCHAR(255),
  pfp_url TEXT,
  interests TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`;
const createTournamentTable = `
CREATE TABLE IF NOT EXISTS tournament(
  id INT AUTO_INCREMENT PRIMARY KEY,
  creator_name VARCHAR(255),
  tournament_name VARCHAR(255) UNIQUE,
  sport_name VARCHAR(255)
);`;
const createTeamTable = `
CREATE TABLE IF NOT EXISTS team(
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_name VARCHAR(255) UNIQUE,
  sport_name VARCHAR(255),
  win_count INT DEFAULT 0,
  loss_count INT DEFAULT 0
);`;
const createMatchesTable = `
CREATE TABLE IF NOT EXISTS matches(
  match_id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT,
  home_team_id INT,
  visiting_team_id INT,
  home_team_score INT,
  visiting_team_score INT,
  FOREIGN KEY (tournament_id) REFERENCES tournament(id),
  FOREIGN KEY (home_team_id) REFERENCES team(id),
  FOREIGN KEY (visiting_team_id) REFERENCES team(id)
);`;

const createFollowsTournamentTable = `
CREATE TABLE IF NOT EXISTS follows_tournament(
  user_id INT,
  tournament_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tournament_id) REFERENCES tournament(id)
);`;

//Create Veiw(s)
const createViewFollowingTournaments = `
CREATE VIEW viewFollowingTournaments AS
	SELECT tournament.id AS tourney_id, tournament_name, creator_name, sport_name, users.id AS user_id
	FROM users JOIN follows_tournament ON users.id = follows_tournament.user_id
	JOIN tournament ON follows_tournament.tournament_id = tournament.id;`;

const createViewGetTourneyMatches = `
CREATE VIEW viewGetTourneyMatches AS
	SELECT matches.*, T1.team_name AS home_team_name, T2.team_name AS visiting_team_name FROM matches
	JOIN team T1 ON matches.home_team_id = T1.id
	JOIN team T2 ON matches.visiting_team_id = T2.id;`;

const createViewAwayTeamMatches = `
CREATE VIEW viewAwayTeamMatches AS
	SELECT *
	FROM team JOIN matches ON team.id = matches.visiting_team_id;`;

//Stored Procs
const insertUserProc = `
CREATE PROCEDURE insertUserProc(
	newUsername VARCHAR(255),
	newEmail VARCHAR(255),
	newPassword VARCHAR (255))
	INSERT INTO users(username,email,password)
	VALUES (newUsername,newEmail,newPassword);`;

const insertProfileProc = `
CREATE PROCEDURE insertProfileProc(
	newUserId INT,
	newDisplayName VARCHAR(255),
	newUrl VARCHAR(255),
	newInterests VARCHAR(255))
	INSERT INTO profiles(user_id, display_name, pfp_url, interests)
	VALUES(newUserId, newDisplayName,newUrl,newInterests);`;

const insertTourneyProc = `
CREATE PROCEDURE insertTourneyProc(
	newCreateName VARCHAR(255),
	newTourneyName VARCHAR(255),
	newSportName VARCHAR(255))
	INSERT INTO tournament(creator_name,tournament_name, sport_name)
	VALUES(newCreateName,newTourneyName,newSportName);`;

const insertTeamProc = `
CREATE PROCEDURE insertTeamProc(
	newTeamName VARCHAR(255),
	newSportName VARCHAR(255))
	INSERT INTO team(team_name,sport_name)
	VALUES(newTeamName,newSportName);`;

const insertFollowsTournament =`
CREATE PROCEDURE insertFollowsTournament(
	newUID INT,
	newTID INT)
	INSERT INTO follows_tournament(user_id,tournament_id)
	VALUES (newUID,newTID);`;

const insertMatchesProc = `
	CREATE PROCEDURE insertMatchesProc(
	newTournamentId int,
	newHomeTeamId int,
	newVisitingTeamId int)
	INSERT INTO matches(tournament_id,home_team_id,visiting_team_id)
	VALUES(newTournamentId,newHomeTeamId,newVisitingTeamId);`;

//Functions
const funcAwayMatchesWon = `
CREATE FUNCTION awayMatchesWon(teamId INT) RETURNS INT
BEGIN
	DECLARE result INT;
	SET result = 0;
	SELECT COUNT(*) INTO result
	FROM viewAwayTeamMatches
	WHERE visiting_team_id = teamId AND visiting_team_score > home_team_score;
	RETURN result;
END;`;


const funcTeamHomeWinsAgainst = `
CREATE FUNCTION teamHomeWinsAgainst(arg_home_team_id INT, arg_away_team_id INT) RETURNS INT
BEGIN
	DECLARE result INT;
	SET result = 0;
	SELECT COUNT(*) INTO result
	FROM matches
	WHERE home_team_id = arg_home_team_id AND visiting_team_id = arg_away_team_id AND home_team_score > visiting_team_score;
	RETURN result;
END;`;

const selectAwayMatchesWon = `
SELECT awayMatchesWon(?) as numWins;`;

const selectHomeWinsAgainst = `
SELECT teamHomeWinsAgainst(?, ?) as homeWins;`;

// Querying the database using built-in method from connection object
// Query method takes sql statement as parameter (which we defined as constants above)
client.query(dropDatabase, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(createDatabase, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(useDatabase, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(changeConfig, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(createUsersTable, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(createProfilesTable, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(createTournamentTable, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(createTeamTable, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(createMatchesTable, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(createFollowsTournamentTable, (err, res) => {
  if (err) console.log(err.stack);
});
//Views
client.query(createViewFollowingTournaments, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(createViewGetTourneyMatches, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(createViewAwayTeamMatches, (err, res) => {
  if (err) console.log(err.stack);
});
//Stored Procedures
client.query(insertUserProc, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(insertProfileProc, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(insertTourneyProc, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(insertTeamProc, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(insertFollowsTournament, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(insertMatchesProc, (err, res) => {
  if (err) console.log(err.stack);
});
//Functions
client.query(funcTeamHomeWinsAgainst, (err, res) => {
  if (err) console.log(err.stack);
});
client.query(funcAwayMatchesWon, (err, res) => {
  if (err) console.log(err.stack);
})

// Inserts
const queryInsertUser = ` CALL insertUserProc(?,?,?);`;
// = insertUserProc(?,?,?)
//INSERT INTO users(username, email, password) VALUES(?,?,?);
const queryInsertProfile = `CALL insertProfileProc(?,?,?,?)`;
//INSERT INTO profiles(user_id, display_name, pfp_url, interests) VALUES(?,?,?,?);
const queryCreateTournament = `CALL insertTourneyProc(?,?,?);`;
//INSERT INTO tournament(creator_name, tournament_name, sport_name) VALUES(?,?,?)
const queryCreateTeam = `CALL insertTeamProc(?,?)`;
//INSERT INTO team(team_name, sport_name) VALUES (?,?)
const queryFollowTourney = `CALL insertFollowsTournament(?,?)`;
//INSERT INTO follows_tournament(user_id, tournament_id) VALUES(?,?);
const queryAddMatch = `CALL insertMatchesProc(?,?,?)`;
//INSERT INTO matches(tournament_id, home_team_id, visiting_team_id) VALUES(?,?,?);
// Selects
const queryLoginUser = `SELECT * FROM users WHERE username = ? AND password = ?`;
const queryUserID = `SELECT id from users WHERE username = ?;`;
const queryProfilePage = `SELECT * from users JOIN profiles on profiles.user_id = users.id WHERE users.id = ?;`;
const queryAllTournaments = `SELECT tournament.id AS tourney_id, tournament_name, creator_name, sport_name FROM tournament;`;
const queryAllTeams = `SELECT * FROM team;`;
const queryTeamID = `SELECT team.id FROM team WHERE team.team_name = ?;`;
const queryTeamName =  `SELECT team_name FROM team WHERE team.id = ?;`;
const queryFollowingTournaments = `
	SELECT *
	FROM viewFollowingTournaments
	WHERE user_id = ?;`;
const queryProfileExists = `
SELECT users.id FROM users
JOIN profiles ON users.id = profiles.user_id
WHERE users.id = ?;`;
const queryGetTourneyMatches = `
SELECT *
FROM viewGetTourneyMatches
WHERE tournament_id = ?;`;
const queryGetTourneyName = `SELECT tournament_name FROM tournament WHERE tournament.id = ?;`;
const queryGetHomeGames = `
SELECT home_team_id, visiting_team_id, team_name AS visiting_team_name FROM matches
JOIN team ON matches.visiting_team_id = team.id
WHERE matches.home_team_id = ?;`;
const queryGetAwayGames = `
SELECT home_team_id, visiting_team_id, team_name AS home_team_name FROM matches
JOIN team ON matches.home_team_id = team.id
WHERE matches.visiting_team_id = ?;`;

// Sample Database
const querySampleUsers = `
INSERT INTO users (id, username, email, password) VALUES
(NULL, 'Obama44', 'presidentObama@usa.gov', 'nomoreosama'),
(NULL, 'Trump', 'president45@usa.gov', 'idonthavesmallhands'),
(NULL, 'Joe Biden', 'VP44@usa.gov', 'ilikeicecream'),
(NULL, 'Bill Gates', 'microsoft@msn.com', 'nomoremalaria'),
(NULL, 'FunHaus', 'funhaus@roosterteeth.com', 'dudesoup2016'),
(NULL, 'temporary_robot', 'hal@skynet.com', 'redditUsers'),
(NULL, 'cantenna1', 'cantenna@gmail.com', 'redditUsers'),
(NULL, 'Big Man', 'bigMan@greengiant.com', 'beanstalk'),
(NULL, 'elasticBeans', 'pinto@aws.com', 'stalkingsChains'),
(NULL, 'corrdork', 'corddork@msn.com', 'theBiggestOfdDorks-'),
(NULL, 'jakeday2192', 'jakeyboy@yahoo.com', 'nakeyJakey7291'),
(NULL, 'Mike Pence', 'VP45@usa.gob', 'yesMother'),
(NULL, 'ADMIN', 'ADMIN@POWER.GOD', 'BIGBOOK');`;

const querySampleTournaments = `
-- Torunaments
INSERT INTO tournament (id, creator_name, tournament_name, sport_name) VALUES
(NULL, 'Mike Pence', 'Indiana4Ever', 'Basketball'),
(NULL, 'temporary_robot', 'Robots>Humans', 'Murder Ball'),
(NULL, 'corrdork', 'Dorks vs the World', 'Rocket League'),
(NULL, 'Big Man', 'The Biggest Man Will Win', 'Sumo'),
(NULL, 'Bill Gates', 'Baseball4Days', 'Baseball'),
(NULL, 'Obama44', 'White House B-BALL', 'Basketball'),
(NULL, 'ADMIN', 'MLB', 'Baseball'),
(NULL, 'ADMIN', 'NBA', 'Basketball');`;

const querySampleProfiles = `
INSERT INTO profiles (user_id, display_name, pfp_url, interests) VALUES
(1, 'Barack The Man Obama', 'https://www.onthisday.com/images/people/barack-obama-medium.jpg', 'Being President of the United States of America'),
(2, 'realDonaldTrump', 'https://cdn.psychologytoday.com/sites/default/files/styles/image-article_inline_full/public/field_blog_entry_images/Kamil%20Krzaczysky%3AReuters.jpg?itok=ldEu1zdz', 'Making America Great Again'),
(4, 'The Only Gates', 'https://timedotcom.files.wordpress.com/2018/09/bill-gates-africa.jpg', 'Irradicating Malaria'),
(6, 'Temporary Robot', 'https://cdn.shopify.com/s/files/1/0080/8372/products/tattly_robot_julia_rothman_00_1024x1024@2x.png?v=1531497414', 'Ruling the World,\r\n BEEP BOOP BEEP'),
(3, 'Uncle Biden', 'https://www.gstatic.com/tv/thumb/persons/588180/588180_v9_ba.jpg', 'Ice Cream'),
('13', 'ADMIN', 'https://ohyog96627.i.lithium.com/html/rank_icons/admin.svg', 'BEING THE LAW'),
('5', 'FunHaus', '', ''),
('7', 'Catenna1', NULL, NULL),
('8', 'Big Man', NULL, NULL),
('9', 'All the Beans', NULL, NULL),
('10', 'corrdork', NULL, 'awdsd aw '),
('11', 'Jakey', NULL, ''),
('12', 'Fencer Pencer', '', '');`;

const querySampleTeams = `
INSERT INTO team (id, team_name, sport_name, win_count, loss_count) VALUES
(NULL, 'NY Knicks', 'Basketball', '4', '2'),
(NULL, 'Brooklyn Nets', 'Basketball', '9', '1'),
(NULL, 'Barcelona FC', 'Soccer', '20', '200'),
(NULL, 'Real Madrid', 'Soccer', '12', '123'),
(NULL, 'Giants', 'Football', '8', '2'),
(NULL, 'Patriots', 'Football', '29', '3'),
(NULL, 'NY Yankees ', 'Baseball', '91', '3'),
(NULL, 'NY Mets', 'Baseball', '12', '3'),
(NULL, 'Cloud9', 'OverWatch', '9', '99'),
(NULL, 'Atlas', 'OverWatch', '1', '3'),
(NULL, 'Golden State Warriors', 'Basketball', '2', '4'),
(NULL, 'LA Lakers', 'Basketball', '51', '2'),
(NULL, 'Boston Celtics', 'Basketball', '12', '3'),
(NULL, 'Houston Rockets', 'Basketball', '123', '151'),
(NULL, 'San Antonio Spurs', 'Basketball', '102', '82'),
(NULL, 'Boston Red Sox', 'Baseball', '0', '9999'),
(NULL, 'LA Dodgers', 'Baseball', '13', '15'),
(NULL, 'Chicago Cubs', 'Baseball', '12', '14'),
(NULL, 'Oklahoma City Thunder', 'Basketball', '145', '123'),
(NULL, 'Miami Heat', 'Basketball', '123', '142');`;

// // For Obama's White House Basketball Tourney
// const querySampleMatches1 = `
// INSERT INTO matches (match_id, tournament_id, home_team_id, visiting_team_id, home_team_score, visiting_team_score) VALUES
// (NULL, '6', '15', '14', '78', '89'),
// (NULL, '6', '1', '2', '99', '91'),
// (NULL, '6', '13', '15', '92', '94'),
// (NULL, '6', '15', '12', '82', '78'),
// (NULL, '6', '15', '2', '145', '152'),
// (NULL, '6', '15', '1', '82', '67'),
// (NULL, '6', '14', '15', '80', '90'),
// (NULL, '6', '14', '13', '71', '82'),
// (NULL, '6', '14', '12', '92', '101'),
// (NULL, '6', '2', '12', '103', '105');`;

// For the NBA
const querySampleMatches2 = `
INSERT INTO matches (match_id, tournament_id, home_team_id, visiting_team_id, home_team_score, visiting_team_score) VALUES
(NULL, '8', '15', '14', '78', '89'),
(NULL, '8', '1', '2', '99', '91'),
(NULL, '8', '13', '15', '92', '94'),
(NULL, '8', '15', '12', '82', '78'),
(NULL, '8', '15', '2', '145', '152'),
(NULL, '8', '15', '1', '82', '67'),
(NULL, '8', '14', '15', '80', '90'),
(NULL, '8', '14', '13', '71', '82'),
(NULL, '8', '14', '12', '92', '101'),
(NULL, '8', '2', '12', '103', '105'),
(NULL, '8', '20', '14', '123', '91'),
(NULL, '8', '19', '1', '108', '119'),
(NULL, '8', '20', '12', '81', '39');`;

// For the MLB
const querySampleMatches3 = `
INSERT INTO matches (match_id, tournament_id, home_team_id, visiting_team_id, home_team_score, visiting_team_score) VALUES
(NULL, '7', '7', '16', '9', '1'),
(NULL, '7', '7', '17', '1', '3'),
(NULL, '7', '7', '18', '2', '0'),
(NULL, '7', '16', '7', '0', '5'),
(NULL, '7', '16', '17', '1', '4'),
(NULL, '7', '18', '7', '1', '2'),
(NULL, '7', '18', '17', '1', '4');`;

// Bill Gates' Charity Tourney
const querySampleMatches4 = `
INSERT INTO matches (match_id, tournament_id, home_team_id, visiting_team_id, home_team_score, visiting_team_score) VALUES
(NULL, '5', '7', '16', '1', '0'),
(NULL, '5', '18', '17', '4', '2');`;

// The Follows Relational TABLE
// Admin Follows All Tourneys
const querySampleFollowsTournament = `
INSERT INTO follows_tournament (user_id, tournament_id) VALUES
('1', '6'),
('1', '7'),
('1', '8'),
('4', '6'),
('1', '6'),
('4', '5'),
('1', '2'),
('10', '6'),
('10', '7'),
('10', '8'),
('13', '1'),
('13', '2'),
('13', '3'),
('13', '4'),
('13', '5'),
('13', '6'),
('13', '7'),
('13', '8');`;

var sampleDatabase = [querySampleUsers, querySampleTournaments, querySampleProfiles, querySampleTeams, querySampleFollowsTournament];
var sampleMatches = [querySampleMatches2, querySampleMatches3, querySampleMatches4];
var i;

// Set to false if you want an empty database
var runSampleDatabase = true;

if (runSampleDatabase) {
  for (i = 0; i < sampleDatabase.length; i++) {
    client.query(sampleDatabase[i], (err, res) => {
      if (err) console.log(err);
    });
  }
  for (i = 0; i < sampleMatches.length; i++) {
    client.query(sampleMatches[i], (err, res) => {
      if (err) console.log(err);
    });
  }
}

// Routing
app.get('/', (req, res) => {
  res.render('login');
});

// Profile creation page for new users.
app.get('/create_profile', (req, res) => {
  res.render('create_profile');
});

// Post request to create new user.
app.post('/create_user', async (req, res) => {
  const username = req.body.createUsername;
  const email = req.body.createEmail;
  const password = req.body.createPassword;
  var temp = await client.query(queryInsertUser, [username, email, password], async (err, results) => {
    if (err) {
      console.log(err);
    } else {
      var rows = await client.query(queryUserID, [username], (err, results) => {
        var userId = results[0].id;
        app.set('userId', userId);
        app.set('username', username);
        console.log('New user created. User id: ' + userId);
        res.redirect('/create_profile');
      });
    }
  });
});

// Post requrest to create a new profile for the new user.
app.post('/create_profile', async (req, res) => {
  const userId = app.get('userId');
  const name = req.body.name;
  const pfp_url = req.body.pfp_url;
  const interests = req.body.interests;
  await client.query(queryInsertProfile, [userId, name, pfp_url, interests], async (err, results) => {
    if (err) {
      console.log(err);
    } else {
      console.log('New profile created for user: ' + userId);
      res.redirect('/profile/' + userId);
    }
  });
});

app.post('/login_user', async (req, res) => {
  const username = req.body.loginUsername;
  const password = req.body.loginPassword;
  await client.query(queryLoginUser, [username, password], async (err, results) => {
    var rows = results[0];

    // Else update current user and redirect to profile page
    var userId = rows.id;
    app.set('userId', userId);
    app.set('username', username);
    console.log("Successfully logged in user with id ", userId);

    // If no profile exists, then redirect to create profile page
    await client.query(queryProfileExists, [userId], async (err2, results2) => {
      if (results2.length == 0) {
        res.redirect('/create_profile');
        return;
      } else {
        res.redirect('/profile/' + userId);
      }
    });
  });
});

// Redirect to current user's profile when accessing from navigation bar.
app.get('/profile', async (req, res) => {
  // If no current user logged in, redirect to login page.
  if (!req.app.get('userId')) {
    console.log('Error connecting to profile');
    res.redirect('/');
    return;
  }
  res.redirect(req.originalUrl + '/' + req.app.get('userId'));
});

// Load current user's profile page
app.get('/profile/:id', async (req, res) => {
  const userId = req.params.id;
  var data = {};
  await client.query(queryProfilePage, [userId], async (err, results) => {
	console.log(err);
    var rows = results[0];
    data.userInfo = rows;
    await client.query(queryFollowingTournaments, [userId], async (err2, results2) => {
	  console.log(err2);
      var rows2 = results2;
      data.userTourneys = rows2;
      res.render('profile', {data});

    });
  });
});

// Load current tournaments
app.get('/tournaments', async (req, res) => {
  var data = {};
  await client.query(queryAllTournaments, async (err, results) => {
    var rows = results;
    data.allTourneys = rows;
    res.render('tournaments', {data});
  })
});

// Load matches for tournament specified by id
app.get('/tournament/:id', async (req, res) => {
  const tourney_id = req.params.id;
  var data = {};
  data.tournament_id = tourney_id;
  await client.query(queryGetTourneyMatches, [tourney_id], async (err, results) => {
    data.matches = results;
    await client.query(queryGetTourneyName, [tourney_id], async (err, results2) => {
      data.tourney_name = results2[0].tournament_name;
      await client.query(queryAllTeams, async (err, results) => {
        data.allTeams = results;
        res.render('tournament', {data});
      });
    });
  });
});

// Form to add match to current tournament
app.post('/tournament/:id/addmatch', async (req, res) => {
  var data = {};
  const tourney_id = req.params.id;
  const home_team_name = req.body.home_team_name;
  const visiting_team_name = req.body.visiting_team_name;
  await client.query(queryTeamID, [home_team_name], async (err, results) => {
    const home_team_id = results[0].id;
    await client.query(queryTeamID, [visiting_team_name], async (err, results2) => {
      const visiting_team_id = results2[0].id;
      await client.query(queryAddMatch, [tourney_id, home_team_id, visiting_team_id], async (err, results3) => {
        res.redirect('back');
      });
    });
  });
});

// Post request for current user to follow tournament
app.post('/tournaments/follow_tournament', async (req, res) => {
  const tourney_id = req.body.tournament_id;
  const userId = app.get('userId');
  await client.query(queryFollowTourney, [userId, tourney_id], async (err, result) => {
    res.redirect('back');
  });
});

// Load create new tournament page (with form)
app.get('/create_new_tournament', async (req, res) => {
  res.render('create_new_tournament');
});

// Post request to create new tournament and redirect to all tournaments page
app.post('/create_new_tournament', async (req, res) => {
  const creator_name = app.get('username');
  const tournament_name = req.body.tournament_name;
  const sport_name = req.body.sport_name;
  await client.query(queryCreateTournament, [creator_name, tournament_name, sport_name], async (err, results) => {
    res.redirect('tournaments');
  });
});

// Load all teams page
app.get('/teams', async (req, res) => {
  var data = {};
  await client.query(queryAllTeams, async (err, results) => {
    data.allTeams = results;
    res.render('teams', {data});
  });
});

// Load team profile page (shows all teams played against)
app.get('/team/:id', async (req, res) => {
  const team_id = req.params.id;
  var data = {};
  data.team_id = team_id;
  await client.query(queryTeamName, [team_id], async (err, results) => {
    data.team_name = results[0].team_name;
    await client.query(queryGetHomeGames, [team_id], async (err, results2) => {
      data.homeGames = results2;
      await client.query(queryGetAwayGames, [team_id], async (err, results3) => {
        data.awayGames = results3;
        await client.query(selectAwayMatchesWon, [team_id], async (err, results4) => {
          data.awayWins = results4[0].numWins;
          res.render('team', {data});
        });
      });
    });
  });
});

// Load team vs page (shows total wins and losses against teams specified by id and id2)
app.get('/team/:id/:id2', async (req, res) => {
  const team_id = req.params.id;
  const visiting_team_id = req.params.id2;
  var data = {};
  data.team_id = team_id;
  data.visiting_team_id = visiting_team_id;
  await client.query(queryTeamName, [team_id], async(err, results) => {
    data.home_team_name = results[0].team_name;
    await client.query(queryTeamName, [visiting_team_id], async(err, results2) => {
      data.visiting_team_name = results2[0].team_name;
      await client.query(selectHomeWinsAgainst, [team_id, visiting_team_id], async(err, results3) => {
        data.homeWins = results3[0].homeWins;
        res.render('vs', {data});
      });
    });
  });
});

// Load create new team page (with form)
app.get('/create_new_team', async (req, res) => {
  res.render('create_new_team');
});

// Post request to create new team
app.post('/create_new_team', async (req, res) => {
  const team_name = req.body.team_name;
  const sport_name = req.body.sport_name;
  await client.query(queryCreateTeam, [team_name, sport_name], async (err, results) => {
    res.redirect('teams');
  });
});

app.get('/logout', (req, res) => {
  res.redirect('/');
});

app.listen(port, () => {
  console.log('Server is starting at port', port);
});
