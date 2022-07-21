use crate::ext_interfaces::*;
use crate::helpers::*;
use crate::types::*;
use errors::*;

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::borsh;
use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, TreeMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::near_bindgen;
use near_sdk::serde_json;
use near_sdk::BorshStorageKey;
use near_sdk::Gas;
use near_sdk::PanicOnDefault;
use near_sdk::PromiseResult;
use near_sdk::{env, AccountId, PromiseOrValue};

mod errors;
mod ext_interfaces;
mod helpers;
mod types;

pub const ONE_YOCTO: u128 = 1;
pub const HUNDRED_PERCENT: u16 = 10000;
pub const FT_TRANSFER_TGAS: Gas = Gas(30_000_000_000_000);
pub const RESERVE_TGAS: Gas = Gas(50_000_000_000_000);

#[derive(BorshSerialize, BorshStorageKey)]
pub enum StorageKey {
    OrdersById,
    MapByOrderId,
    Orders,
    OrdersWithKey { orders_key: String },
    FilledOrders,
    FilledOrdersWithKey { orders_key: String },
    OrdersToOrderBookWithKey { orders_key: String },
    OrdersToOrderBook,
    OrderIdToOrder,
    FeesByAccountIds,
}

#[near_bindgen]
#[derive(PanicOnDefault, BorshSerialize, BorshDeserialize)]
pub struct Market {
    version: u8,
    orders: UnorderedMap<String, TreeMap<OrderId, Order>>,
    finished_orders: UnorderedMap<String, TreeMap<OrderId, FilledOrderAction>>,
    orders_to_orderbook: UnorderedMap<String, TreeMap<OrderId, OrderToOrderBook>>,
    order_id_to_order: LookupMap<OrderId, Order>,
    fees: LookupMap<AccountId, Fee>,
}

#[near_bindgen]
impl FungibleTokenReceiver for Market {
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        let token = env::predecessor_account_id();
        env::log_str(&format!(
            "Transfered {:?} {} from {}",
            amount, token, sender_id
        ));
        env::log_str(&format!("transfer msg: {}", msg));
        if msg.is_empty() {
            return PromiseOrValue::Value(amount);
        } else {
            let message =
                serde_json::from_str::<TokenReceiverMessage>(&msg).expect(ERR07_WRONG_MSG_FORMAT);
            match message {
                TokenReceiverMessage::NewOrderAction {
                    sell_token,
                    sell_amount,
                    raw_sell_amount,
                    buy_token,
                    buy_amount,
                    raw_buy_amount,
                    action,
                    creation_time,
                    status,
                } => {
                    env::log_str("its new_order_action");

                    let clonned_buy_token = buy_token.clone();
                    let clonned_sell_token = sell_token.clone();

                    let new_order_action = NewOrderAction {
                        buy_token: clonned_buy_token,
                        sell_amount,
                        raw_sell_amount,
                        sell_token: clonned_sell_token,
                        buy_amount,
                        raw_buy_amount,
                        action,
                        creation_time,
                        status,
                    };

                    let orderbook_action = OrderToOrderBook {
                        buy_amount: raw_buy_amount,
                        buy_token,
                        sell_amount: raw_sell_amount,
                        sell_token,
                    };

                    self.add_order(new_order_action, sender_id);
                    self.add_order_to_orderbook(orderbook_action);
                    return PromiseOrValue::Value(U128(0));
                }
                TokenReceiverMessage::Match {
                    order_id,
                    orderbook_id,
                    matching_time,
                } => {
                    env::log_str("its order match ");

                    self.match_order(sender_id, order_id, orderbook_id, matching_time, amount, token);
                    return PromiseOrValue::Value(U128(0));
                }
            }
        }
    }
}

#[near_bindgen]
impl Market {
    #[init]
    pub fn new(version: u8) -> Self {
        let this = Self {
            version,
            orders: UnorderedMap::new(StorageKey::Orders),
            finished_orders: UnorderedMap::new(StorageKey::FilledOrders),
            orders_to_orderbook: UnorderedMap::new(StorageKey::OrdersToOrderBook),
            order_id_to_order: LookupMap::new(StorageKey::OrderIdToOrder),
            fees: LookupMap::new(StorageKey::FeesByAccountIds),
        };
        this
    }

    #[private]
    #[init(ignore_state)]
    pub fn clean(keys: Vec<near_sdk::json_types::Base64VecU8>) {
        for key in keys.iter() {
            env::storage_remove(&key.0);
        }
    }

    fn match_order(
        &mut self,
        sender_id: AccountId,
        order_id: OrderId,
        orderbook_id: OrderId,
        matching_time: String,
        amount: U128,
        token: AccountId,
    ) {
        env::log_str(&format!(
            "match_order: {}, {:?}, {}",
            order_id, amount, token
        ));
        let existed_order = self.order_id_to_order.get(&order_id);
        if existed_order.is_none() {
            env::panic_str(ERR03_ORDER_NOT_FOUND);
        }

        let order = existed_order.unwrap();

        if amount != order.buy_amount {
            env::panic_str(ERR05_NOT_VALID_AMOUNT);
        }

        if token != order.buy_token {
            env::panic_str(ERR06_NOT_VALID_TOKEN);
        }

        println!(
            "{:?} (Prepaid gas) - {:?} (Used gas) - {:?} (FT_TRANSFER_FGAS) - {:?} (RESERVE_GAS)",
            env::prepaid_gas(),
            env::used_gas(),
            FT_TRANSFER_TGAS,
            RESERVE_TGAS
        );

        let gas_for_next_callback =
            env::prepaid_gas() - env::used_gas() - FT_TRANSFER_TGAS - RESERVE_TGAS;
        println!("Prepared gas, {:?}", env::prepaid_gas());
        println!("Gas for next callback {:?}", gas_for_next_callback);

        ft_token::ft_transfer(
            order.maker,
            order.buy_amount,
            "".to_string(),
            order.buy_token.clone(),
            ONE_YOCTO,
            FT_TRANSFER_TGAS,
        )
        .then(ext_self::callback_on_send_tokens_to_maker(
            sender_id.clone(), // matcher
            order.sell_amount,
            order.sell_token.clone(),
            order.buy_token.clone(),
            order_id.clone(),
            orderbook_id.clone(),
            env::current_account_id(),
            0,
            gas_for_next_callback,
        ));

        let orders = self
            .get_orders(order.sell_token.clone(), order.buy_token.clone())
            .unwrap();

        for order in orders.iter() {
            if order.order_id == order_id {
                let mut current_order = order.order.clone();
                let maker = current_order.maker.clone();
                let matcher = sender_id.clone();
                current_order.status = String::from("Finished");

                let action = FilledOrderAction {
                    sell_token: current_order.buy_token,
                    sell_amount: current_order.sell_amount,
                    buy_token: current_order.sell_token,
                    buy_amount: current_order.buy_amount,
                    action: current_order.action,
                    creation_time: matching_time.clone(),
                    status: current_order.status,
                    matcher,
                    maker,
                };

                self.add_filled_order(action);
                println!("Hi")
            }
        }
        println!("Buy token: {}, sell token, {}", order.buy_token, order.sell_token);
        let orders = self.get_filled_orders(order.buy_token, order.sell_token);
        
        println!("FINISHED ORDERS {:?}", orders)
    }

    fn get_or_create_fee_info(&mut self, sell_token: &AccountId) -> Fee {
        match self.fees.get(sell_token) {
            Some(fee) => fee,
            None => {
                let fee = Fee {
                    // 1 / 100 = 0.01%
                    // 100% = HUNDRED_PERCENT = 10000
                    percent: 100,
                    earned: 0,
                };

                self.fees.insert(sell_token, &fee);
                fee
            }
        }
    }

    fn take_fee(&mut self, amount: u128, sell_token: &AccountId) -> u128 {
        let fee_value = self.get_or_create_fee_info(sell_token).percent;
        let fee = amount * ((HUNDRED_PERCENT - fee_value) as u128) / (HUNDRED_PERCENT as u128);
        fee
    }

    pub fn set_fee(&mut self, token: AccountId, percent: u16) {
        assert_owner();
        assert!(percent <= HUNDRED_PERCENT);
        assert!(percent >= 1);

        let earned = match self.fees.get(&token) {
            Some(v) => v.earned,
            None => 0,
        };

        self.fees.insert(&token, &Fee::new(percent, earned));
    }

    pub fn transfer_earned_fees(&mut self, token: AccountId, amount: u128, receiver: AccountId) {
        assert_owner();

        let fee_info = self.fees.get(&token).expect(ERR10_NOT_ENOUGH);

        if fee_info.earned == 0 {
            env::panic_str("no need to transfer zero amount");
        }

        if amount > fee_info.earned {
            env::panic_str(ERR10_NOT_ENOUGH);
        }

        let gas_for_next_callback =
            env::prepaid_gas() - env::used_gas() - FT_TRANSFER_TGAS - RESERVE_TGAS;

        ft_token::ft_transfer(
            receiver.clone(),
            U128(amount),
            "transfer from contract".to_string(),
            token.clone(),
            ONE_YOCTO,
            FT_TRANSFER_TGAS,
        )
        .then(ext_self::callback_on_send_tokens_to_ext_account(
            token,
            receiver,
            U128(amount),
            env::current_account_id(),
            0,
            gas_for_next_callback,
        ));
    }

    #[private]
    fn callback_on_send_tokens_to_ext_account(
        &mut self,
        token: AccountId,
        receiver: AccountId,
        amount: U128,
    ) {
        assert_eq!(
            env::promise_results_count(),
            1,
            "{}",
            ERR08_NOT_CORRECT_PROMISE_RESULT_COUNT
        );

        match env::promise_result(0) {
            PromiseResult::Failed => env::log_str("failed to transfer tokens to receiver"),
            PromiseResult::Successful(_) => {
                env::log_str("tokens successfully transferred to receiver");

                let mut fee_info = match self.fees.get(&token) {
                    Some(v) => v,
                    None => env::panic_str("failed to get fee info for token"),
                };

                fee_info.earned = fee_info.earned.saturating_sub(amount.0);
                self.fees.insert(&token, &fee_info);
            }
            _ => unreachable!(),
        }
    }

    #[private]
    pub fn callback_on_send_tokens_to_maker(
        &mut self,
        sender_id: AccountId,  //matcher
        sell_amount: U128,     //order.sell_amount
        sell_token: AccountId, //order.sell_token
        buy_token: AccountId,  //order.buy_token
        order_id: OrderId,  
        orderbook_id: OrderId   //order.order_id
    ) {
        assert_eq!(
            env::promise_results_count(),
            1,
            "{}",
            ERR08_NOT_CORRECT_PROMISE_RESULT_COUNT
        );
        let is_promise_success: bool = match env::promise_result(0) {
            PromiseResult::NotReady => unreachable!(),
            PromiseResult::Successful(_) => true,
            PromiseResult::Failed => false,
        };

        if is_promise_success {
            let gas_for_next_callback =
                env::prepaid_gas() - env::used_gas() - FT_TRANSFER_TGAS - RESERVE_TGAS;

            let fee = self.take_fee(sell_amount.0, &sell_token);

            // check storage deposit
            ft_token::ft_transfer(
                sender_id,
                U128(fee),
                "".to_string(),
                sell_token.clone(),
                ONE_YOCTO,
                FT_TRANSFER_TGAS,
            )
            .then(ext_self::callback_after_deposit(
                U128(fee),
                sell_token,
                buy_token,
                order_id,
                orderbook_id,
                env::current_account_id(),
                0,
                gas_for_next_callback,
            ));
        } else {
            // for example maker did not registred buy_token
            env::panic_str(ERR01_INTERNAL);
        }
    }

    #[private]
    pub fn callback_after_deposit(
        &mut self,
        fee: U128,
        sell_token: AccountId,
        buy_token: AccountId,
        order_id: OrderId,
        orderbook_id: OrderId
    ) {
        assert_eq!(
            env::promise_results_count(),
            1,
            "{}",
            ERR08_NOT_CORRECT_PROMISE_RESULT_COUNT
        );

        if let PromiseResult::Failed = env::promise_result(0) {
            env::log_str("failed to transfer token to sender")
        } else {
            env::log_str("transfer token to sender completed successfully");
            let mut fee_info = self.get_or_create_fee_info(&sell_token);
            fee_info.earned += fee.0;

            self.fees.insert(&sell_token, &fee_info);
        }

        let key = compose_key(&sell_token, &buy_token);
        let orders_map = self
            .orders
            .get(&key)
            .unwrap_or_else(|| env::panic_str(ERR01_INTERNAL));

        let order_book_map = self
            .orders_to_orderbook
            .get(&key)
            .unwrap_or_else(|| env::panic_str(ERR01_INTERNAL));

        self.internal_remove_order(&key, orders_map, order_id);
        self.internal_remove_orderbook_order(&key, order_book_map, orderbook_id)
    }

    fn add_order(&mut self, action: NewOrderAction, sender: AccountId) {
        let new_order = Order::from_action(action, sender);

        let key = compose_key(&new_order.sell_token, &new_order.buy_token);
        let orders_key = key.clone();
        let mut orders_map = self
            .orders
            .get(&key)
            .unwrap_or(TreeMap::new(StorageKey::OrdersWithKey { orders_key }));

        let order_id = new_order.get_id();
        if orders_map.contains_key(&order_id) {
            env::panic_str(ERR02_ORDER_ALREADY_EXISTS);
        }

        orders_map.insert(&new_order.get_id(), &new_order);

        self.order_id_to_order.insert(&order_id, &new_order);
        self.orders.insert(&key, &orders_map);
    }

    pub fn add_order_to_orderbook(&mut self, orderbook_action: OrderToOrderBook) {
        let key = compose_key(&orderbook_action.sell_token, &orderbook_action.buy_token);
        let orders_key = key.clone();
        let mut orders_map = self.orders_to_orderbook.get(&key).unwrap_or(TreeMap::new(
            StorageKey::OrdersToOrderBookWithKey { orders_key },
        ));
        let id = orderbook_action.get_id();

        if orders_map.contains_key(&id) {
            env::panic_str(ERR02_ORDER_ALREADY_EXISTS);
        }

        orders_map.insert(&orderbook_action.get_id(), &orderbook_action);

        env::log_str(&format!("Order {} added to orderbook", id));

        self.orders_to_orderbook.insert(&key, &orders_map);
    }

    fn add_filled_order(&mut self, action: FilledOrderAction) {
        let finished_order = action.clone();

        if finished_order.status.ne(&String::from("Finished")) {
            env::panic_str(ERR11_NOT_VALID_ORDER_STATUS);
        }

        let key = compose_key(&finished_order.sell_token, &finished_order.buy_token);
        let orders_key = key.clone();

        let mut finished_orders_map = self
            .finished_orders
            .get(&key)
            .unwrap_or(TreeMap::new(StorageKey::FilledOrdersWithKey { orders_key }));

        let finished_order_id = finished_order.get_id();

        if finished_orders_map.contains_key(&finished_order_id) {
            env::panic_str(ERR02_ORDER_ALREADY_EXISTS);
        }

        println!("FINISHED ORDER IN FUNCTION {:?}", key);

        finished_orders_map.insert(&finished_order.get_id(), &finished_order);

        self.finished_orders.insert(&key, &finished_orders_map);
        println!("Hi from add_silled");
        env::log_str(&format!(
            "Order {} added to the filled_orders struct",
            &finished_order_id
        ))
    }

    pub fn remove_order(
        &mut self,
        sell_token: AccountId,
        buy_token: AccountId,
        order_id: OrderId,
        orderbook_order_id: OrderId,
    ) {
        let key = compose_key(&sell_token, &buy_token);
        let order_by_key = self.orders.get(&key);

        if order_by_key.is_none() {
            env::panic_str(ERR03_ORDER_NOT_FOUND);
        }

        let orders_map = order_by_key.unwrap();
        let order = orders_map.get(&order_id);

        if order.is_none() {
            env::panic_str(ERR03_ORDER_NOT_FOUND);
        }

        let order = order.unwrap();
        let maker = order.maker;
        if maker != env::predecessor_account_id() {
            env::panic_str(ERR04_PERMISSION_DENIED)
        }

        self.remove_orderbook_order(sell_token, buy_token, orderbook_order_id);

        self.internal_remove_order(&key, orders_map, order_id);

        ft_token::ft_transfer(
            maker,
            order.sell_amount,
            "".to_string(),
            order.sell_token.clone(),
            ONE_YOCTO,
            FT_TRANSFER_TGAS,
        );

        env::log_str("Tokens were transfered")
    }

    pub fn remove_orderbook_order(
        &mut self,
        sell_token: AccountId,
        buy_token: AccountId,
        order_id: OrderId,
    ) {
        let key = compose_key(&sell_token, &buy_token);
        let order_by_key = self.orders_to_orderbook.get(&key);

        if order_by_key.is_none() {
            env::panic_str(ERR03_ORDER_NOT_FOUND);
        }

        let orders_map = order_by_key.unwrap();
        let order = orders_map.get(&order_id);

        if order.is_none() {
            env::panic_str(ERR03_ORDER_NOT_FOUND);
        }

        self.internal_remove_orderbook_order(&key, orders_map, order_id);
    }

    fn internal_remove_orderbook_order(
        &mut self,
        key: &String,
        mut orders_map: TreeMap<OrderId, OrderToOrderBook>,
        order_id: OrderId,
    ) {
        orders_map.remove(&order_id);

        if orders_map.len() == 0 {
            self.orders_to_orderbook.remove(key);
        } else {
            self.orders_to_orderbook.insert(key, &orders_map);
        }
    }

    fn internal_remove_order(
        &mut self,
        key: &String,
        mut orders_map: TreeMap<OrderId, Order>,
        order_id: OrderId,
    ) {
        orders_map.remove(&order_id);

        if orders_map.len() == 0 {
            self.orders.remove(key);
        } else {
            self.orders.insert(key, &orders_map);
        }

        self.order_id_to_order.remove(&order_id);
    }

    pub fn get_order(&self, order_id: OrderId) -> Option<Order> {
        self.order_id_to_order.get(&order_id)
    }

    pub fn get_orders(
        &self,
        sell_token: AccountId,
        buy_token: AccountId,
    ) -> Option<Vec<OrderView>> {
        let key = compose_key(&sell_token, &buy_token);
        let order_by_key = self.orders.get(&key);
        if order_by_key.is_none() {
            return None;
        }
        let unwrapped_order = order_by_key.unwrap();

        let mut res = vec![];

        let orders = unwrapped_order;

        let order_iter = orders.iter();

        for order in order_iter {
            res.push(OrderView {
                order: order.1.clone(),
                order_id: order.0.clone(),
            })
        }

        return Some(res);
    }

    pub fn get_filled_orders(
        &self,
        sell_token: AccountId,
        buy_token: AccountId,
    ) -> Option<Vec<FilledOrderView>> {
        let key = compose_key(&sell_token, &buy_token);
        let finished_order_by_key = self.finished_orders.get(&key);
        
        if finished_order_by_key.is_none() {
            return None;
        };

        let mut res = vec![];
        let finished_orders = finished_order_by_key.unwrap();

        let finished_order_iter = finished_orders.iter();
        for finished_order in finished_order_iter {
            
            res.push(FilledOrderView {
                order: finished_order.1.clone(),
                order_id: finished_order.0.clone(),
            })
        }
        return Some(res);
    }

    pub fn get_orders_to_orderbook(
        &self,
        sell_token: &AccountId,
        buy_token: &AccountId,
    ) -> Option<Vec<GetOrderToOrderBook>> {
        let key = compose_key(&sell_token, &buy_token);

        let orders_to_orderbook_by_key = self.orders_to_orderbook.get(&key);

        if orders_to_orderbook_by_key.is_none() {
            return None;
        };

        let mut res = vec![];
        let orders_to_orderbook = orders_to_orderbook_by_key.unwrap();

        let orders_to_orderbook_iter = orders_to_orderbook.iter();
        for order_to_orderbook in orders_to_orderbook_iter {
            res.push(GetOrderToOrderBook {
                order_id: order_to_orderbook.0,
                order: order_to_orderbook.1,
            })
        }
        return Some(res);
    }

    pub fn get_pairs(&self) -> Vec<String> {
        let keys = self.orders.keys_as_vector();
        keys.to_vec()
    }
    pub fn get_finished_pairs(&self) -> Vec<String> {
        let keys = self.finished_orders.keys_as_vector();
        keys.to_vec()
    }
}

fn compose_key(sell_token: &AccountId, buy_token: &AccountId) -> String {
    let mut key = String::from(sell_token.as_str());
    key.push_str("#");
    key.push_str(buy_token.as_str());
    key
}

#[cfg(test)]
mod tests {

    use near_sdk::{test_utils::VMContextBuilder, testing_env};

    use super::*;

    fn create_test_order(sell_amount: u128, buy_amount: u128) -> Order {
        Order {
            maker: AccountId::new_unchecked(String::from("maker.near")),
            sell_token: AccountId::new_unchecked(String::from("xabr.allbridge.testnet")),
            sell_amount: U128(sell_amount),
            buy_token: AccountId::new_unchecked(String::from("abr.allbridge.testnet")),
            buy_amount: U128(buy_amount),
            action: String::from("buy"),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        }
    }

    fn fee_test(contract: &mut Market, token: &str, amount: u128, expect: u128) {
        assert_eq!(contract.take_fee(amount, &(token.parse().unwrap())), expect);
    }

    #[test]
    #[should_panic]
    fn test_fee_overflow() {
        let key = "".to_string();
        let mut contract = Market {
            orders: UnorderedMap::new(StorageKey::Orders),
            finished_orders: UnorderedMap::new(StorageKey::FilledOrders),
            orders_to_orderbook: UnorderedMap::new(StorageKey::OrdersToOrderBook),
            order_id_to_order: LookupMap::new(StorageKey::OrderIdToOrder),
            version: 1,
            fees: LookupMap::new(StorageKey::FeesByAccountIds),
        };

        contract.set_fee("sometoken.near".parse().unwrap(), HUNDRED_PERCENT + 1)
    }

    #[test]
    #[should_panic]
    fn test_fee_too_low() {
        let key = "".to_string();
        let mut contract = Market {
            orders: UnorderedMap::new(StorageKey::Orders),
            finished_orders: UnorderedMap::new(StorageKey::FilledOrders),
            orders_to_orderbook: UnorderedMap::new(StorageKey::OrdersToOrderBook),
            order_id_to_order: LookupMap::new(StorageKey::OrderIdToOrder),
            version: 1,
            fees: LookupMap::new(StorageKey::FeesByAccountIds),
        };

        contract.set_fee("sometoken.near".parse().unwrap(), 0)
    }

    #[test]
    fn test_fee() {
        let key = "".to_string();

        let mut contract = Market {
            orders: UnorderedMap::new(StorageKey::Orders),
            finished_orders: UnorderedMap::new(StorageKey::FilledOrders),
            orders_to_orderbook: UnorderedMap::new(StorageKey::OrdersToOrderBook),
            order_id_to_order: LookupMap::new(StorageKey::OrderIdToOrder),
            version: 1,
            fees: LookupMap::new(StorageKey::FeesByAccountIds),
        };

        let mut builder = VMContextBuilder::new();
        testing_env!(builder
            .storage_usage(env::storage_usage())
            .attached_deposit(0)
            .predecessor_account_id(AccountId::new_unchecked(String::from("aromankov.testnet")))
            .current_account_id(AccountId::new_unchecked(String::from("aromankov.testnet")))
            .build());

        fee_test(&mut contract, "sometoken.near", 100, 99);
        fee_test(&mut contract, "sometoken.near", 23200, 22968);
        fee_test(&mut contract, "sometoken.near", 1111111, 1099999);
        fee_test(
            &mut contract,
            "sometoken.near",
            1000000000000000000000000000,
            990000000000000000000000000,
        );

        contract.set_fee("sometoken2.near".parse().unwrap(), 500);

        fee_test(&mut contract, "sometoken2.near", 100, 95);
        fee_test(&mut contract, "sometoken2.near", 23200, 22040);
        fee_test(&mut contract, "sometoken2.near", 1111111, 1055555);
        fee_test(
            &mut contract,
            "sometoken2.near",
            1000000000000000000000000000,
            950000000000000000000000000,
        );
    }

    #[test]
    #[should_panic]
    fn test_fee_wrong_permissions() {
        let key = "".to_string();
        let mut contract = Market {
            orders: UnorderedMap::new(StorageKey::Orders),
            finished_orders: UnorderedMap::new(StorageKey::FilledOrders),
            orders_to_orderbook: UnorderedMap::new(StorageKey::OrdersToOrderBook),
            order_id_to_order: LookupMap::new(StorageKey::OrderIdToOrder),
            version: 1,
            fees: LookupMap::new(StorageKey::FeesByAccountIds),
        };

        let mut builder = VMContextBuilder::new();
        testing_env!(builder
            .storage_usage(env::storage_usage())
            .attached_deposit(0)
            .predecessor_account_id(AccountId::new_unchecked(String::from("aromankov.testnet")))
            .build());
        contract.set_fee("sometoken2.near".parse().unwrap(), 500);
    }

    #[test]
    fn test_order_hash() {
        let order = create_test_order(1000000000000000000000000, 1000000000000000000000000);
        let order1 = create_test_order(1000000000000000000000000, 1000000000000000000000000);

        assert_eq!(order.get_id(), order1.get_id());

        let order2 = Order {
            maker: AccountId::new_unchecked(String::from("maker.near")),
            sell_token: AccountId::new_unchecked(String::from("abr.allbridge.testnet")),
            sell_amount: U128(1000000000000000000000000), // param changed
            buy_token: AccountId::new_unchecked(String::from("xbr.allbridge.testnet")),
            buy_amount: U128(1000000000000000000000000),
            action: String::from("buy"),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        };

        assert_ne!(order.get_id(), order2.get_id());
    }

    #[test]
    fn test_add_order() {
        let key = "".to_string();
        let mut contract = Market {
            orders: UnorderedMap::new(StorageKey::Orders),
            finished_orders: UnorderedMap::new(StorageKey::FilledOrders),
            orders_to_orderbook: UnorderedMap::new(StorageKey::OrdersToOrderBook),
            order_id_to_order: LookupMap::new(StorageKey::OrderIdToOrder),
            version: 1,
            fees: LookupMap::new(StorageKey::FeesByAccountIds),
        };

        let mut builder = VMContextBuilder::new();
        testing_env!(builder
            .storage_usage(env::storage_usage())
            .attached_deposit(0)
            .predecessor_account_id(AccountId::new_unchecked(String::from("aromankov.testnet")))
            .build());

        let new_order_action_1 = NewOrderAction {
            sell_token: AccountId::new_unchecked(String::from("xabr.allbridge.testnet")),
            sell_amount: U128(1000000000000000000000000),
            raw_sell_amount: U128(100),
            buy_token: AccountId::new_unchecked(String::from("abr.allbridge.testnet")),
            buy_amount: U128(1000000000000000000000000),
            raw_buy_amount: U128(10),
            action: String::from("buy"),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        };

        contract.add_order(
            new_order_action_1.clone(),
            AccountId::new_unchecked(String::from("aromankov.testnet")),
        );

        let new_order_action_2 = NewOrderAction {
            sell_token: AccountId::new_unchecked(String::from("abr.allbridge.testnet")),
            sell_amount: U128(1000000000000000000000000),
            raw_sell_amount: U128(100),
            buy_token: AccountId::new_unchecked(String::from("xabr.allbridge.testnet")),
            buy_amount: U128(1000000000000000000000000),
            raw_buy_amount: U128(10),
            action: String::from("buy"),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        };

        contract.add_order(
            new_order_action_2.clone(),
            AccountId::new_unchecked(String::from("aromankov.testnet")),
        );

        // check get pairs
        assert!(contract.get_pairs().len() != 0);

        // check get orders
        let orders_1 = contract
            .get_orders(
                new_order_action_1.sell_token.clone(),
                new_order_action_1.buy_token.clone(),
            )
            .unwrap();
        assert!(orders_1.len() == 1);

        let orders_2 = contract
            .get_orders(
                new_order_action_2.sell_token.clone(),
                new_order_action_2.buy_token.clone(),
            )
            .unwrap();
        assert!(orders_2.len() == 1);

        let order_2 = orders_2.get(0).unwrap();
        let order_id_2 = order_2.order_id.clone();
        assert_eq!(
            *order_2,
            OrderView {
                order: Order {
                    buy_amount: new_order_action_2.buy_amount.clone(),
                    sell_amount: new_order_action_2.sell_amount.clone(),
                    buy_token: new_order_action_2.buy_token.clone(),
                    sell_token: new_order_action_2.sell_token.clone(),
                    action: String::from("buy"),
                    creation_time: String::from("1656859460876"),
                    maker: AccountId::new_unchecked(String::from("aromankov.testnet")),
                    status: String::from("New")
                },
                order_id: order_id_2.clone()
            }
        );

        let order_1 = orders_1.get(0).unwrap();
        let order_id_1 = order_1.order_id.clone();

        assert_eq!(
            *order_1,
            OrderView {
                order: Order {
                    buy_amount: new_order_action_1.buy_amount.clone(),
                    sell_amount: new_order_action_1.sell_amount.clone(),
                    buy_token: new_order_action_1.buy_token.clone(),
                    sell_token: new_order_action_1.sell_token.clone(),
                    action: String::from("buy"),
                    creation_time: String::from("1656859460876"),
                    maker: AccountId::new_unchecked(String::from("aromankov.testnet")),
                    status: String::from("New")
                },
                order_id: order_id_1.clone()
            }
        );

        // check remove order
        assert!(contract.get_order(order_id_1.clone()).is_some());

        contract.remove_order(
            new_order_action_1.sell_token.clone(),
            new_order_action_1.buy_token.clone(),
            order_id_1.clone(),
            "".to_string(),
        );

        contract.remove_order(
            new_order_action_2.sell_token.clone(),
            new_order_action_2.buy_token.clone(),
            order_id_2,
            "".to_string(),
        );

        assert!(contract.get_pairs().len() == 0);
        assert!(contract.get_order(order_id_1).is_none());
    }

    #[test]
    fn test_orders_ordered_by_price() {
        let key = "".to_string();

        let mut contract = Market {
            orders: UnorderedMap::new(StorageKey::Orders),
            finished_orders: UnorderedMap::new(StorageKey::FilledOrders),
            orders_to_orderbook: UnorderedMap::new(StorageKey::OrdersToOrderBook),
            order_id_to_order: LookupMap::new(StorageKey::OrderIdToOrder),
            version: 1,
            fees: LookupMap::new(StorageKey::FeesByAccountIds),
        };
        let mut builder = VMContextBuilder::new();
        testing_env!(builder
            .storage_usage(env::storage_usage())
            .attached_deposit(0)
            .predecessor_account_id(AccountId::new_unchecked(String::from("aromankov.testnet")))
            .build());

        let account1: AccountId = "xabr.allbridge.testnet".parse().unwrap();
        let account2: AccountId = "abr.allbridge.testnet".parse().unwrap();

        let new_order_action_1 = NewOrderAction {
            sell_token: account1.clone(),
            sell_amount: U128(20000000000),
            raw_sell_amount: U128(200),
            buy_token: account2.clone(),
            action: String::from("buy"),
            buy_amount: U128(1000000000),
            raw_buy_amount: U128(10),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        };

        contract.add_order(
            new_order_action_1.clone(),
            AccountId::new_unchecked(String::from("aromankov.testnet")),
        );

        let new_order_action_2 = NewOrderAction {
            sell_token: account1.clone(),
            sell_amount: U128(10000000000),
            raw_sell_amount: U128(100),
            buy_token: account2.clone(),
            buy_amount: U128(1),
            raw_buy_amount: U128(100000000),
            action: String::from("buy"),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        };

        contract.add_order(
            new_order_action_2.clone(),
            AccountId::new_unchecked(String::from("aromankov.testnet")),
        );

        let new_order_action_2 = NewOrderAction {
            sell_token: account1.clone(),
            sell_amount: U128(1),
            raw_sell_amount: U128(100000000),
            buy_token: account2.clone(),
            buy_amount: U128(2),
            raw_buy_amount: U128(200000000),
            action: String::from("buy"),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        };

        let new_order_action_3 = NewOrderAction {
            sell_token: account1.clone(),
            sell_amount: U128(1),
            raw_sell_amount: U128(100000000),
            buy_token: account2.clone(),
            buy_amount: U128(1),
            raw_buy_amount: U128(100000000),
            action: String::from("buy"),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        };

        contract.add_order(
            new_order_action_2.clone(),
            AccountId::new_unchecked(String::from("aromankov.testnet")),
        );

        let orders = contract
            .get_orders(account1, account2)
            .unwrap()
            .into_iter()
            .map(|i| i.order.get_price_for_key())
            .collect::<Vec<_>>();

        assert!(orders[0] < orders[1]);
        assert!(orders[1] < orders[2]);
    }
    #[test]
    fn test_order_match() {
        let key = "".to_string();

        let mut contract = Market {
            orders: UnorderedMap::new(StorageKey::Orders),
            finished_orders: UnorderedMap::new(StorageKey::FilledOrders),
            orders_to_orderbook: UnorderedMap::new(StorageKey::OrdersToOrderBook),
            order_id_to_order: LookupMap::new(StorageKey::OrderIdToOrder),
            version: 1,
            fees: LookupMap::new(StorageKey::FeesByAccountIds),
        };
        let mut builder = VMContextBuilder::new();
        testing_env!(builder
            .storage_usage(env::storage_usage())
            .attached_deposit(0)
            .predecessor_account_id(AccountId::new_unchecked(String::from("aromankov.testnet")))
            .build());

        let account1: AccountId = "xabr.allbridge.testnet".parse().unwrap();
        let account2: AccountId = "abr.allbridge.testnet".parse().unwrap();

        let new_order_action = NewOrderAction {
            sell_token: account1.clone(),
            sell_amount: U128(1),
            raw_sell_amount: U128(100000000),
            buy_token: account2.clone(),
            buy_amount: U128(2),
            raw_buy_amount: U128(200000000),
            action: String::from("buy"),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        };
        let option_orders = contract.get_orders(
            new_order_action.sell_token.clone(),
            new_order_action.buy_token.clone(),
        );
        env::log_str(&format!("Option order {:?}", option_orders));
        if Option::is_none(&option_orders) {
            contract.add_order(new_order_action.clone(), account1.clone());
        }

        let orders = contract
            .get_orders(
                new_order_action.sell_token.clone(),
                new_order_action.buy_token.clone(),
            )
            .unwrap();

        env::log_str(&format!("ORDERS {:?}", orders[0]));


        let orderbook_action = OrderToOrderBook {
            sell_amount: U128(10),
            buy_amount: U128(1),
            sell_token: account1.clone(),
            buy_token: account2.clone(),
        };

        contract.add_order_to_orderbook(orderbook_action.clone());

        let orderbook_orders = contract.get_orders_to_orderbook(&orderbook_action.sell_token, &orderbook_action.buy_token);
        println!(
            "ORDERS TO ORDERBOOK BEFORE REMOVE {:?}",
            orderbook_orders.unwrap()
        );

        contract.match_order(
            account2,
            orders[0].order_id.clone(),
            String::from("8974421291949051132"),
            String::from("1657957099811"),
            orders[0].order.buy_amount,
            orders[0].order.buy_token.clone(),
        );

        // let finished_orders = contract
        //     .get_filled_orders(
        //         orders[0].order.sell_token.clone(),
        //         orders[0].order.buy_token.clone(),
        //     )
        //     .unwrap();
        // env::log_str(&format!(
        //     "FINISHED ORDERS AFTER MATCH {:?}",
        //     finished_orders
        // ));

        let normal_orders =
            contract.get_orders(new_order_action.sell_token, new_order_action.buy_token);
        env::log_str(&format!("NORMAL ORDERS AFTER MATCH {:?}", normal_orders));
    }

    #[test]
    fn test_orderbook_struct() {
        let mut contract = Market {
            orders: UnorderedMap::new(StorageKey::Orders),
            finished_orders: UnorderedMap::new(StorageKey::FilledOrders),
            orders_to_orderbook: UnorderedMap::new(StorageKey::OrdersToOrderBook),
            order_id_to_order: LookupMap::new(StorageKey::OrderIdToOrder),
            version: 1,
            fees: LookupMap::new(StorageKey::FeesByAccountIds),
        };
        let mut builder = VMContextBuilder::new();
        testing_env!(builder
            .storage_usage(env::storage_usage())
            .attached_deposit(0)
            .predecessor_account_id(AccountId::new_unchecked(String::from("aromankov.testnet")))
            .build());

        let account1: AccountId = "xabr.allbridge.testnet".parse().unwrap();
        let account2: AccountId = "abr.allbridge.testnet".parse().unwrap();

        let orderbook_action = OrderToOrderBook {
            sell_amount: U128(10),
            buy_amount: U128(1),
            sell_token: account1.clone(),
            buy_token: account2.clone(),
        };

        let sell_token = orderbook_action.clone().sell_token;
        let buy_token = orderbook_action.clone().buy_token;

        contract.add_order_to_orderbook(orderbook_action.clone());
        let orderbook_orders = contract.get_orders_to_orderbook(&sell_token, &buy_token);
        println!(
            "ORDERS TO ORDERBOOK BEFORE REMOVE {:?}",
            orderbook_orders.unwrap()
        );
        let new_order_action = NewOrderAction {
            sell_token: account1.clone(),
            sell_amount: U128(1),
            raw_sell_amount: U128(100000000),
            buy_token: account2.clone(),
            buy_amount: U128(2),
            raw_buy_amount: U128(200000000),
            action: String::from("buy"),
            creation_time: String::from("1656859460876"),
            status: String::from("New"),
        };

        contract.add_order(
            new_order_action,
            AccountId::new_unchecked(String::from("dimag.testnet")),
        );
        let orders = contract.get_orders(sell_token.clone(), buy_token.clone());
        println!("ORDERS {:?}", orders);

        contract.remove_order(
            sell_token.clone(),
            buy_token.clone(),
            String::from("12599025030355093368"),
            String::from("8974421291949051132"),
        );

        let orders = contract.get_orders(sell_token.clone(), buy_token.clone());
        let orderbook_orders = contract.get_orders_to_orderbook(&sell_token, &buy_token);

        if orders.is_none() && orderbook_orders.is_none() {
            println!("Orders were deleted");
        }
    }
}
