package com.timestored.kdb.examples.feedhandler;

import java.io.IOException;

import com.kx.c.KException;

/**
 * Demonstrate creating feedhandler, making it listen to incoming data
 * and forwarding to the q server.
 *
 * Before running start a q server on port 5001 that defines the table below:
 * trade:([]time:`time$();sym:`symbol$();price:`float$();size:`int$();stop:`boolean$();cond:`char$();ex:`char$())
 * and a .u.upd function, as java-api-server.q does. A plain .u.upd:insert
 * also works. This allows using the same commands as a kdb+ tickerplant.
 */
public class FeedDemo {
	public static void main(String... args) throws KException, IOException {
		FeedHandler feedHandler = new FeedHandler("localhost", 5001);
		FakeFeed.INSTANCE.addListener(feedHandler);
	}
}
