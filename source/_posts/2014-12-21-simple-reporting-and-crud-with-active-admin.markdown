---
layout: post
title: "Simple Reporting and CRUD with Active Admin"
date: 2014-12-21 19:38:59 +1000
comments: true
share: true
categories: 
---

Active Admin is the best way to build simple CRUD's to collect and report data. This makes it excellent for building internal applications and replacing the default internal application - Microsoft Excel.

<!-- more -->

#Installation



Start by having [installing Ruby and Rails](https://www.digitalocean.com/community/tutorials/how-to-install-ruby-on-rails-on-ubuntu-12-04-lts-precise-pangolin-with-rvm)

Create a new rails project, the rails version needs to be earlier than 4.2 as of this post.

	rails _4.1.0_ new active-admin-demo


Add active admin and devise (for authentication) to the Gemfile.

{% codeblock lang:ruby  Gemfile%}

gem 'activeadmin', github: 'activeadmin'
gem 'devise'


{% endcodeblock %}


For 4.x you need to track the github version of active admin.

Run the following commands

	rails g active_admin:install   
	rake db:migrate
	rails s

Go to http://localhost:3000/admin and you should see the following login page.

![Alt text](/images/posts/aa/aa_1.png)

Login with admin@example.com and 'password' and you will be taken to the admin dashboard.

![Alt text](/images/posts/aa/aa_2.png)





So whats going on here? Starting with the url http://localhost:3000/admin/dashboard 'admin' is the *namespace*, which maps roughly to department for most internal applications. Dashboard is the home page of any namespace. If you click on Admin Users you will be taken to a list of users. This is a *resource* and every resource has an index page like this, along with the filters on the side and the actions on the top right, in this case the only action is "New Admin User".


#Adding Data

So lets get some actual data in here. For this I will use the Chinook sqlite sample database, https://chinookdatabase.codeplex.com/downloads/get/557773.

Copy this into the db folder, then add the following connection to database.yml. 

{% codeblock lang:yaml  /config/database.yml%}

data_warehouse:
	  <<: *default
	  database: db/Chinook_Sqlite.sqlite

{% endcodeblock %}

Multiple connections are not required. It could make sense to install the Active Admin tables (admin_users and comments) in the same database. Alternatively installing AA without authentication and with comments disabled requires no extra tables.
	


Create employee.rb in app/models with the following

{% codeblock lang:ruby  /app/models/employee.rb%}

class Employee < ActiveRecord::Base
	establish_connection "data_warehouse"
	self.table_name = "Employee"
	self.primary_key = 'EmployeeId'
end

{% endcodeblock %}

	

then go to app/admin and create another file called employee.rb

{% codeblock lang:ruby  /app/admin/employee.rb%}
ActiveAdmin.register Employee do
end

{% endcodeblock %}

	


Restart the rails application and there should be an Employees resource in active admin. 

![Alt text](/images/posts/aa/aa_3.png)


Straight away you get a decent looking CRUD for adminstering this table. A more common use for Active Admin is internal reporting, and this does require some customization. The reporting template I use is demonstrated below using the Employees resource.

{% codeblock lang:ruby  /app/admin/employee.rb%}	
ActiveAdmin.register Employee do

	#remove unnesecary UI elements and name report
	config.clear_action_items!
	actions :all, except: [:edit, :destroy]
	config.batch_actions = false
	menu :label => proc{ "Employee Report" }

	#Narrow filters to useful list
	filter :FirstName
	filter :LastName
	filter :Title
	filter :City
	filter :Email

	#common queries
	scope :all
	scope :Calgary do |e|
		e.where("city = 'Calgary'")
	end

	#Remove XML and JSON from download options
	index :download_links => [:csv], :title => "Employee Report" do
		column :FirstName
		column :LastName
		column :Title
		#Link ReportsTo to Name
		column :ReportsTo do |e|
			m = Employee.find_by_EmployeeId(e.ReportsTo)

			if(m)
				"#{m.FirstName} #{m.LastName}"
			else
				""
			end
		end
		column :BirthDate do |e|
			e.BirthDate.to_date
		end
		column :HireDate do |e|
			e.BirthDate.to_date
		end
		column :Address
		column :City
		column :PostalCode
		column :Phone
		column :Fax
		column :Email
	end

	csv do
		column :FirstName
		column :LastName
		column :Title
		column :ReportsTo do |e|
			m = Employee.find_by_EmployeeId(e.ReportsTo)

			if(m)
				"#{m.FirstName} #{m.LastName}"
			else
				""
			end
		end
		column :BirthDate do |e|
			e.BirthDate.to_date
		end

		column :HireDate do |e|
			e.BirthDate.to_date
		end
		column :Address
		column :City
		column :PostalCode
		column :Phone
		column :Fax
		column :Email
	end
end

{% endcodeblock %}




![Alt text](/images/posts/aa/aa_7.png)





#Other Customization and Tricks


##CSV and Comments


CSV downloads of reports are limited to 20,000 rows by default, which is a hassle for large reports. Additionally the comments functionality of active admin is generally not useful. This can be changed by adding this block to /config/initializers/active_admin.rb

{% codeblock lang:ruby  /app/admin/employee.rb%}

ActiveAdmin.setup do |config|
	config.site_title = "Reporting Portal"

	#disable comments
	config.allow_comments = false


		#increase csv limit
	module ActiveAdmin
		class ResourceController < BaseController
			module DataAccess
				def max_csv_records
					150_000
				end
	        	def max_per_page
	          		150_000
            	end
	      	end

	  ...

  {% endcodeblock %}




##Authentication

In this example I have used the default option of Devise. Often simply disabling authentication is fine for internal apps, especially ones which are only for viewing data rather than changing it. Alternatively authentication through LDAP or Google Apps is a sensible solution for internal applications (net-ldap is a good gem for LDAP integration).

##Gotchas

* tables need a primary key to work as active admin resources
* active admin has had breaking API changes in the past, so relying on older blog posts does not always work. If you dont need to run the latest version of rails the older rubygems packaged version tends to have more code samples










