---
title: QuantifiedDev API
mediaroot: media
markdown2extras: wiki-tables
---

# QuantifiedDev API

REST APIs


### All API calls start with

<pre class="base">
     {{url_base}}
</pre>

### Format

All responses are **JSON** (that is, except for the current HTML docs that
you are reading).




# Events

## GET /events

Get events 

The list can be filtered on some of the manifest fields. Currently:
**type**.
For example: `/events?type=nodejs`.

Results are ordered by ???


#### example request

    $ curl {{url_base}}/events?type=mydev

#### response
    
    ???



## GET /event_counts

Get counts for the events for particular event type.
**type**

#### example request

    $ curl {{url_base}}/event_counts?type=mydev

#### response

    {

    }


On error it can respond with any of **409 Conflict** (if UUID is taken),
**403 Forbidden** (if not authorized to add datasets) or
**400 Bad Request** (validation errors).

#### example error response

    {
      "error": {
        "message": "UUID param, '73ce06d8-7ae7-11e0-b0df-1fcf8f45c5d5', does not match the UUID in the uploaded manifest, '63ce06d8-7ae7-11e0-b0df-1fcf8f45c5d5'.",
        "code": 400
      }
    }

## GET /health

General health check: "Is the server up?"
If basic auth credentials are provided, then authorization will be attempted
and, on success, some authorized user data shown in the response.

#### example JSON response

    {
        "status": "I am alive",
    }

