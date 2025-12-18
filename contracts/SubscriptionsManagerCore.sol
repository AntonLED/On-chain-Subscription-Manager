// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SubscriptionCore is ReentrancyGuard {
	struct Plan {
		address merchant;
		IERC20 token;
		uint256 amount;
		uint256 frequency;
		bool isActive;
	}

	struct Subscription {
		uint256 planId;
		address subscriber;
		uint256 nextChargeAt;
		bool isCancelled;
	}

	uint256 public nextPlanId;
	uint256 public nextSubId;

	mapping(uint256 => Plan) public plans;
	mapping(uint256 => Subscription) public subscriptions;

	event PlanCreated(uint256 planId, address merchant, uint256 amount);
	event Subscribed(uint256 subId, address subscriber, uint256 planId);
	event Charged(uint256 subId, uint256 amount, uint256 nextChargeDate);
	event Canceled(uint256 subId);

	error PlanNotActive();
	error NotSubscriber();
	error AlreadyCanceled();
	error PaymentNotDue();
	error TransferFailed();

	function createPlan(
		address _token,
		uint256 _amount,
		uint256 _frequency
	) external {
		plans[nextPlanId] = Plan({
			merchant: msg.sender,
			token: IERC20(_token),
			amount: _amount,
			frequency: _frequency,
			isActive: true
		});
		emit PlanCreated(nextPlanId, msg.sender, _amount);
		nextPlanId++;
	}

	function subscribe(uint256 _planId) external nonReentrant {
		Plan storage plan = plans[_planId];
		if (!plan.isActive) revert PlanNotActive();

		bool success = plan.token.transferFrom(
			msg.sender,
			plan.merchant,
			plan.amount
		);
		if (!success) revert TransferFailed();

		subscriptions[nextSubId] = Subscription({
			planId: _planId,
			subscriber: msg.sender,
			nextChargeAt: block.timestamp + plan.frequency,
			isCancelled: false
		});

		emit Subscribed(nextSubId, msg.sender, _planId);
		nextSubId++;
	}

	function charge(uint256 _subId) external nonReentrant {
		Subscription storage sub = subscriptions[_subId];
		Plan storage plan = plans[sub.planId];

		if (sub.isCancelled) revert AlreadyCanceled();
		if (block.timestamp < sub.nextChargeAt) revert PaymentNotDue();

		sub.nextChargeAt += plan.frequency;

		bool success = plan.token.transferFrom(
			sub.subscriber,
			plan.merchant,
			plan.amount
		);
		if (!success) revert TransferFailed();

		emit Charged(_subId, plan.amount, sub.nextChargeAt);
	}

	function cancel(uint256 _subId) external {
		Subscription storage sub = subscriptions[_subId];

		if (msg.sender != sub.subscriber) revert NotSubscriber();
		if (sub.isCancelled) revert AlreadyCanceled();

		sub.isCancelled = true;
		emit Canceled(_subId);
	}
}
