# Probler
**Poll** data as a service -> **Parse** data as a service -> **Model** data as service -> 
**Cache** data as a service -> **Persist** data as a service. 

All agnostic to networking, cloud, kubernetes, docker, security & model.

## Overview
**"Been there, done that"** — but what does **“as a service”** really mean?
Anyone who has faced the challenges mentioned above understands the cost
and pain points of attempting this using a **Microservices** approach.
In such a setup, multiple applications — each with its own business
logic — interact with and rely on a single model,
all while maintaining concurrency & maintainability. It’s complex and far from painless.

**Probler** is a journey focused on making it as easy and painless as possible to 
address, abstract, and interface with the challenges and pain points of 
**Microservices—across** the entire stack. The goal is to arrive at a well-defined, 
coherent development framework that significantly accelerates Microservices-based 
application development while drastically reducing costs—without compromising on 
security, concurrency, testability, or maintainability.

## Problem Definition
Building applications in a **Microservices environment** has revealed critical gaps 
in design patterns, infrastructure, and tooling—particularly in internal 
service-to-service integration. To address these challenges, organizations often 
form **Infrastructure Teams** tasked with the nearly **impossible goal** of 
delivering a perfect solution from day one. **Unsurprisingly**, this often leads 
to failure, as the sheer number of moving parts and lack of alignment across teams 
makes **full coherence unachievable**.

![alt text](https://github.com/saichler/layer8/blob/main/problem-1.png)
![alt text](https://github.com/saichler/layer8/blob/main/problem-2.png)

## **The result?** Massive costs in both time and money—and even greater long-term expenses when it comes to maintainability.

## The Journey
Over the years, I’ve closely observed the recurring challenges faced by the 
organizations I’ve been part of—particularly the pain points, inconsistencies, 
and design missteps in building Microservices architectures. I started from a 
humble place: I didn’t claim to know everything, and I’m certainly no expert in 
every domain—but I’ve always been clear about what I want to achieve.

### For the infrastructure, my vision was:
* To free developers from worrying about **Security & AAA** (Authentication, Authorization,
Accounting) during app development, **without compromising on their importance**.
* To enable **seamless, secure** platform- and machine-agnostic communication between 
Microservices, omitting the need for **Micro Segmentation**
* To support OS-, Kubernetes-, and Docker-**agnostic deployments**.
* To support seamless **Horizontally & Vertically** scale.
* To provide built-in support for both **Request/Reply** and **Publish/Subscribe** 
messaging paradigms.
* To include a **Service Directory** for service discovery and lookup.
* To embed **Health Monitoring** capabilities.
* To support **Leader/Follower** election mechanisms for stateful services.
* To define **common API exposure** standards across all Microservices.
* To allow **flexible API invocation** patterns tailored to different use cases.
* To introduce a **common API querying language**, enabling Microservices to query 
each other effectively.
* To support **transactional API invocations** in Active/Active service setups.
* To handle **sharded, transactional API** invocations across multiple service instances (e.g., Active/Active with 3+ shards).
* To implement a **distributed, model-agnostic stateful cache**.
* To enable seamless **delta notifications** for attribute changes between services.
* To support seamless **delta updates** on the cache itself.
* To offer an **ORM-as-a-Service** that requires little to no annotations in the data models.
* To make the **ORM agnostic** to the model design.
* To achieve **100% testability** for the application on **any laptop**, 
regardless of the installed operating system.
* To be compatible with running on mobile phone??!

### For Probler, I envisioned:
* A collection Microservice that is both **horizontally and vertically** scalable.
* A parsing Microservice that is **entirely model-agnostic**.
* A **metadata-driven instrumentation service** capable of populating the model 
with parsed data—without writing proprietary code.
* An inventory Microservice that **does not depend** on any specific model.
* A persistence service that is similarly **model-agnostic**.


## Base Projects
* https://github.com/saichler/types

* https://github.com/saichler/shared

* https://github.com/saichler/layer8

* https://github.com/saichler/servicepoints

* https://github.com/saichler/serializer

* https://github.com/saichler/reflect

* https://github.com/saichler/gsql

* https://github.com/saichler/l8orm

* https://github.com/saichler/l8web

* https://github.com/saichler/collect

* https://github.com/saichler/l8test

