/** A parsed Soroban contract event stored in the database */
export interface IndexedEvent {
  id?: number;
  contract_id: string;
  ledger: number;
  ledger_closed_at: string;
  tx_hash: string;
  event_type: string;
  topic_0: string;
  topic_1: string | null;
  topic_2: string | null;
  topic_3: string | null;
  value: string;
  indexed_at: string;
}

/** Indexer run state stored in the database */
export interface IndexerState {
  contract_id: string;
  last_ledger: number;
  updated_at: string;
}

/** Pagination params for REST API queries */
export interface QueryParams {
  contract_id?: string;
  event_type?: string;
  from_ledger?: number;
  to_ledger?: number;
  limit?: number;
  offset?: number;
}
