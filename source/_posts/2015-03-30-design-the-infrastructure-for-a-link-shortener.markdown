---
layout: post
title: "Design the infrastructure for a link-shortener"
date: 2015-03-30 20:20:36 +1000
comments: true
published: false
categories: 
---

Two points I took away from this great post by Robert heaton. http://robertheaton.com/2014/03/07/lessons-from-a-silicon-valley-job-search/

Having a few blog posts can help your job search, and a really common interview question is "Design the infrastructure for a link-shortener". So... two birds with one stone?

This is a question that has been going around for a while, if this 2012 post is anything to go by.

http://www.tawheedkader.com/2012/03/how-to-hire-a-hacker-for-your-startup/

This would be my approach

##Whats a link shortener?

Link shorteners do two core things, and a third thats very common

1) When you give the service a URL, the service returns a url on a domain controlled by the service
2) When you visit the shortened URL you are redirected to the original url
3) These services generally track details about visitors to these links
Bit.ly is an example of a link shortener


##The computer science problem

Understanding Big-O complexities is often a key requirement of these job interviews so lets start there. This problem is fundamentally a key-value lookup. The best data structure to solve this problem is a Hash Table. These have average search complexity of O(1) which is perfect for our search heavy requirements.

##The object model

For persisted data we will need two objects

Link
* id:string -> primary key, clustered index
* url:string ->

View
* id - > primary key, clustered index
* link_id -> foreign key to link
* header
* potentially lots more fields

Link will be used for the primary service, View will be used for analytics on visitors.


##The App

The app has two routes, GET /links to redirect and POST /links to add a new shortened url

		GET '/links/:id'

		def show
			link = Links.find(id)
			View.create(request_header)
			redirect_to link.url
		end

		POST '/links/:url'

		def create
			link = Link.create(url)
			link.id
		end


##Infrastructure

A load balancer is the entry point for the application. This can be scaled through round robin DNS if needed.

The LB then directs traffic to multiple App Servers. Regardless of scale I would start with two app servers to allow rolling restarts and deployments.

App Servers can be scaled horizontally or vertically as usage grows.

The final layer (for now) is the Database layer. This wouldnt necessarily be a SQL database, something like DynamoDB would be a good fit.

##Optimization

The most obvious optimization is adding a caching layer. This is a key-value store with expiring keys. Expiry would be based on metrics around views.

The next optimization would be moving the creation of View objects to a asynchronous process. So instead of writing 

* key point optimizing cached and non cached reads
* could add metrics like twi







