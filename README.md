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

**The result?** Massive costs in both time and money—and even greater long-term 
expenses when it comes to maintainability.

## Base Projects
https://github.com/saichler/types
https://github.com/saichler/shared
https://github.com/saichler/layer8
https://github.com/saichler/servicepoints
https://github.com/saichler/serializer
https://github.com/saichler/reflect
https://github.com/saichler/gsql
https://github.com/saichler/l8orm
https://github.com/saichler/l8web
https://github.com/saichler/collect
https://github.com/saichler/l8test

