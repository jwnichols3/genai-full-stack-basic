# API Specification

## REST API Specification

```yaml
openapi: 3.0.0
info:
  title: EC2 Instance Management API
  version: 1.0.0
  description: REST API for managing EC2 instances with role-based access control
servers:
  - url: https://api.ec2-manager.example.com/v1
    description: Production API Gateway endpoint
components:
  securitySchemes:
    CognitoAuth:
      type: apiKey
      in: header
      name: Authorization
      description: Cognito JWT token
  schemas:
    EC2Instance:
      type: object
      properties:
        instanceId:
          type: string
        instanceType:
          type: string
        state:
          type: string
          enum: [pending, running, stopping, stopped, shutting-down, terminated]
        publicIp:
          type: string
          nullable: true
        privateIp:
          type: string
        launchTime:
          type: string
          format: date-time
        availabilityZone:
          type: string
        tags:
          type: object
          additionalProperties:
            type: string
    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            requestId:
              type: string
paths:
  /instances:
    get:
      summary: List all EC2 instances
      security:
        - CognitoAuth: []
      parameters:
        - name: state
          in: query
          schema:
            type: string
          description: Filter by instance state
        - name: tag
          in: query
          schema:
            type: string
          description: Filter by tag (format: key=value)
      responses:
        '200':
          description: List of EC2 instances
          content:
            application/json:
              schema:
                type: object
                properties:
                  instances:
                    type: array
                    items:
                      $ref: '#/components/schemas/EC2Instance'
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
  /instances/{instanceId}:
    get:
      summary: Get instance details
      security:
        - CognitoAuth: []
      parameters:
        - name: instanceId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Instance details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EC2Instance'
        '404':
          description: Instance not found
  /instances/{instanceId}/reboot:
    post:
      summary: Reboot an instance (admin only)
      security:
        - CognitoAuth: []
      parameters:
        - name: instanceId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Reboot initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  instanceId:
                    type: string
        '403':
          description: Forbidden - admin role required
        '404':
          description: Instance not found
  /instances/{instanceId}/metrics:
    get:
      summary: Get CloudWatch metrics for instance
      security:
        - CognitoAuth: []
      parameters:
        - name: instanceId
          in: path
          required: true
          schema:
            type: string
        - name: metricName
          in: query
          required: true
          schema:
            type: string
            enum: [CPUUtilization, NetworkIn, NetworkOut, DiskReadBytes, DiskWriteBytes]
        - name: period
          in: query
          schema:
            type: integer
            default: 300
        - name: startTime
          in: query
          schema:
            type: string
            format: date-time
        - name: endTime
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: Metrics data
          content:
            application/json:
              schema:
                type: object
                properties:
                  metrics:
                    type: array
                    items:
                      type: object
                      properties:
                        timestamp:
                          type: string
                        value:
                          type: number
                        unit:
                          type: string
  /audit-logs:
    get:
      summary: Get audit logs (admin only)
      security:
        - CognitoAuth: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: userId
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Audit log entries
          content:
            application/json:
              schema:
                type: object
                properties:
                  logs:
                    type: array
                    items:
                      type: object
        '403':
          description: Forbidden - admin role required
```
