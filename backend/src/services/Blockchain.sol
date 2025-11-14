// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TournamentStorage {
    struct Match {
        string player1;
        string player2;
        string winner;
        uint256 score1;
        uint256 score2;
        uint256 timestamp;
    }

    struct Tournament {
        uint256 id;
        string finalBracketJson;
        uint256 timestamp;
    }

    mapping(uint256 => Match[]) private tournamentMatches;
    mapping(uint256 => Tournament) private tournaments;
    uint256[] private allTournamentIds;

    event MatchResult(
        uint256 indexed tournamentId,
        string player1,
        string player2,
        string winner,
        uint256 score1,
        uint256 score2,
        uint256 timestamp
    );

    event FinalBracketStored(uint256 indexed tournamentId, string bracketJson, uint256 timestamp);

    function storeMatch(
        uint256 tournamentId,
        string memory player1,
        string memory player2,
        string memory winner,
        uint256 score1,
        uint256 score2
    ) external {
        Match memory newMatch = Match(player1, player2, winner, score1, score2, block.timestamp);
        tournamentMatches[tournamentId].push(newMatch);

        emit MatchResult(tournamentId, player1, player2, winner, score1, score2, block.timestamp);
    }

    function storeFinalBracket(uint256 tournamentId, string memory bracketJson) external {
        if (tournaments[tournamentId].id == 0) {
            tournaments[tournamentId].id = tournamentId;
            allTournamentIds.push(tournamentId);
        }
        tournaments[tournamentId].finalBracketJson = bracketJson;
        tournaments[tournamentId].timestamp = block.timestamp;

        emit FinalBracketStored(tournamentId, bracketJson, block.timestamp);
    }

    function getTournamentCount() external view returns (uint256) {
        return allTournamentIds.length;
    }

    function getAllTournamentIds() external view returns (uint256[] memory) {
        return allTournamentIds;
    }

    function getMatchCount(uint256 tournamentId) external view returns (uint256) {
        return tournamentMatches[tournamentId].length;
    }

    function getMatchInfo(uint256 tournamentId, uint256 index) external view returns (
        string memory player1,
        string memory player2,
        string memory winner,
        uint256 score1,
        uint256 score2,
        uint256 timestamp
    ) {
        Match storage m = tournamentMatches[tournamentId][index];
        return (m.player1, m.player2, m.winner, m.score1, m.score2, m.timestamp);
    }

    function getFinalBracket(uint256 tournamentId) external view returns (string memory) {
        return tournaments[tournamentId].finalBracketJson;
    }
}
