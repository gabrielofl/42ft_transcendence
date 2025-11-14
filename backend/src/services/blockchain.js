import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, [
  'function storeMatch(uint256,string,string,string,uint256,uint256) external',
  'function storeFinalBracket(uint256,string) external',
  'function getMatchInfo(uint256,uint256) view returns (string,string,string,uint256,uint256,uint256)',
  'function getMatchCount(uint256) view returns (uint256)',
  'function getFinalBracket(uint256) view returns (string)',
], wallet);

export { contract };

export async function blockchainWriteMatchOnce(
  fastify,
  { tournamentId, matchId, player1, player2, winner, score1, score2 }
) {
  const existing = await fastify.db.get(
    `SELECT txhash FROM tournament_onchain_matches WHERE tournament_id=? AND match_id=?`,
    [tournamentId, matchId]
  );
  if (existing?.txhash) return existing.txhash;

  const before = await contract.getMatchCount(Number(tournamentId));
  const tx = await contract.storeMatch(
    Number(tournamentId),
    String(player1),
    String(player2),
    String(winner),
    Number(score1),
    Number(score2)
  );
  await tx.wait();

  const after = await contract.getMatchCount(Number(tournamentId));
  const chainIndex = Number(after) - 1;

  await fastify.db.run(
    `INSERT OR REPLACE INTO tournament_onchain_matches
     (tournament_id, match_id, chain_index, txhash)
     VALUES (?, ?, ?, ?)`,
    [tournamentId, matchId, chainIndex, tx.hash]
  );

  return tx.hash;
}

export async function blockchainWriteFinalBracketOnce(fastify, tournamentId, finalBracket) {
  const row = await fastify.db.get(
    `SELECT onchain_final_bracket_txhash FROM tournaments WHERE id=?`,
    [tournamentId]
  );
  if (row?.onchain_final_bracket_txhash) return row.onchain_final_bracket_txhash;

  const bracketJson = typeof finalBracket === 'string' ? finalBracket : JSON.stringify(finalBracket);
  const tx = await contract.storeFinalBracket(Number(tournamentId), bracketJson);
  await tx.wait();

  await fastify.db.run(
    `UPDATE tournaments SET onchain_final_bracket_txhash=? WHERE id=?`,
    [tx.hash, tournamentId]
  );
  return tx.hash;
}

export async function getMatchCount(tournamentId) { return contract.getMatchCount(Number(tournamentId)); }
export async function getMatch(tournamentId, index) {
  const [player1, player2, winner, score1, score2, timestamp] =
    await contract.getMatchInfo(Number(tournamentId), Number(index));
  return { player1, player2, winner, score1, score2, timestamp };
}
export async function getFinalBracket(tournamentId) { return contract.getFinalBracket(Number(tournamentId)); }
