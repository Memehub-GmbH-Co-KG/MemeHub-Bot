# RRB Messaging

The MemeHub Bot uses [redis-request-broker](https://www.npmjs.com/package/redis-request-broker) to send messages and requests between components via the redis pub/sub system. Here is a list of messages that are sent over the network:

## Messages

On-way messaging (PUB/SUB)

  - `events:vote`: A user issued a vote
    ```ts
    {
      vote_type: string // The type of the vote, as deined in vote-types.json
      new_count: number // The new amount of votes of this type on the meme
      user_id: string // The id of the user that issued the vote
      self_vote: boolean // Weather the poster voted his own meme (after the change)
      meme: {
        id: string // The id of the meme
        poster_id: string // The id of the user that posted the meme
        private_message_id: string // The id of the message in the chat with the poster
        group_message_id: string // The id of the message in the group
      }
    }
    ```
  - `events:retract-vote`: A user retracted a vote
    ```ts
    {
      vote_type: string // The type of the vote, as deined in vote-types.json
      new_count: number // The new amount of votes of this type on the meme
      self_vote: boolean // Weather the poster voted his own meme (after the change)
      user_id: string // The id of the user that issued the vote
      meme: {
        id: string // The id of the meme
        poster_id: string // The id of the user that posted the meme
        private_message_id: string // The id of the message in the chat with the poster
        group_message_id: string // The id of the message in the group
      }
    }
    ```
  - `events:post`: A user posted a meme
    ```ts
    {
      meme_id: string // The id of the meme that got posted
      poster_id: string // The id of the user that posted the meme
    }
    ```
  - `events:edit`: A meme has been edited
    ```ts
    {
      meme_id: string, // The id of the meme that got edited
      in_group: boolean // True, if the meme has been posted in the meme group
    } 
    ```
  - `logging:log`: A log message
   ```ts
   {
     level: string // The level of the log, as defined in the MemeHub-Logger
     component: string // The component that send the log
     instance: string // The instance that send the log
     title: string // The title of the log
     data?: any // Optional. Any data that belongs to the log
   }
   ```
  - `events:config-changed`: The config has been changed
    ```ts
    string[] // The keys that have changed
    ```
  - `events:contest-created`: A new contest has been created
    ```ts
    {
      id: string, // The id of the contest
      tag: string, // The hashtag / category of the contest
      emoji: string, // The emoji of the contest
      running: boolean // True, if the contest is running
    }
    ```
  - `events:contest-deleted`: A contest has been deleted
    ```ts
    string // The id of the contest
    ```
  - `events:contest-started`: A contest has been started
    ```ts
    string // The id of the contest
    ```
  - `events:contest-stopped`: A contest has been stopped
    ```ts
    string // The id of the contest
    ```
  - `events:category-created`: A category has been created
    ```ts
    {
      created: string, // The new category
      categories: string[] // The list of categories after the change
    }
    ```
  - `events:category-deleted`: A category has been deleted
    ```ts
    {
      deleted: string, // The old category
      categories: string[] // The list of categories after the change
    }
    ```
  - `events:category-mapping-created`: A category mapping has been created
    ```ts
    {
      created: string, // The key of the created mapping
      category: string, // The resulting category of the created mapping
      mappings: { [key: string ]: string} // The mappings after the change
    }
    ```
  - `events:category-mapping-deleted`: A category mapping has been deleted
    ```ts
    {
      deleted: string // The key of the deleted
      mappings: { [key: string ]: string} // The mappings after the change
    }
    ```
  - `events:category-maximum-changed`: The maximum of allowed categories on a meme has changed
    ```ts
    number // The new maximum
    ```

## Requests

Request and response messaging (RPC)

### General

 - `bot-token`: Request the currently used bot token
    - Worker: `MemeHub-Bot`
    - Request data:
      ```ts
      // (none)
      ```
    - Response data:
      ```ts
      string // The bot token
      ```

### Limits

 - `limits:may-post`: Reqeusts weather a user may issue a post due to the post limit
    - Worker: `MemeHub-Limits`
    - Request data:
      ```ts
      {
        user_id: string // The id of the user in question
      }
      ```
    - Response data:
      ```ts
      boolean // Weather the user may post right now
      ```
  - `limits:may-vote`: Requests weather a user may issue or retract a vote on a meme
     - Worker: `MemeHub-Limits`
     - Request data:
       ```ts
       {
         user_id: string, // The id of the user in question
         meme_id: string // The id of the meme in question
       }
       ```
     - Response data:
       ```ts
       boolean // Weather the user may vote on the meme right now
       ```
  - `limits:quota`: Requests relevant information on posting limits
     - Worker: `MemeHub-Limits`
     - Request data:
       ```ts
       {
         user_id: string // The id of the user in question
       }
       ```
     - Reponse data:
       ```ts
       {
         tokens: number, // The amount of meme tokes the user has
         freePosts: number // The amount of posts a user may issue before having to pay with tokens
       }
       ```

### Tokens

  - `tokens:issue`: Alters the amount of tokens a user has
      - Worker: `MemeHub-Limits` (should be moved into own module)
      - Request data:
        ```ts
        {
          user_id: string, // The user in question
          amount: number // The amount of tokens to give (negative to take away tokens)
        }
        ```
      - Response data:
        ```ts
        number // The new amount of tokens the user has
        ```

### Contests

  - `contests:create`: Creates a new contest
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        {
          id: string, // The id / name of the contest. Used for managing it.
          tag: string, // The hastag that users choose when submitting for this contest
          emoji: string // A emoji that can make the contest stand out
        }
        ```
      - Response data:
        ```ts
        boolean // True, if the contest has been created
        ```
  - `contests:start`: Starts a contest
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        string // The id / name of the contest to start
        ```
      - Response data:
        ```ts
        boolean // True, if the contest has been started
        ```
  - `contests:stop`: Stops a contest
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        string // The id / name of the contest to stop
        ```
      - Response data:
        ```ts
        boolean // True, if the contest has been stopped
        ```
  - `contests:delete`: Deletes a contest
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        string // The id / name of the contest to delete
        ```
      - Response data:
        ```ts
        boolean // True, if the contest has been deleted
        ```
  - `contests:list`: Shows a list of existing contests
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        {
          onlyRunning: boolean // If true, only running contests will be returned
        }
        ```
      - Response data:
        ```ts
        {
          id: string, // The id of the contest
          tag: string, // The hashtag / category of the contest
          emoji: string, // The emoji of the contest
          running: boolean // True, if this contest is running
        }[]
        ```
  - `contest:top`: Shows the best contributions for a contest
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        {
          id: string, // The id of the contest
          vote_type: string, // The vote type that counts
          amount: number // The amount of memes to return
        }
        ``` 
      - Response data:
        ```ts
        string[] // a list of meme ids
        ```

### Categories

  - `categories:create`: Creates a new category
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        {
          category: string, // The category to create
          validate: boolean // If true, only adds the category if it is valid
        }
        ``` 
      - Response data:
        ```ts
        {
          created: boolean, // True if the category has been created
          categories: string[] // The list of categories after the operation
        }
        
        ```
  - `categories:delete`: Deletes a category
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        {
          category: string // The category to delete
        }
        ``` 
      - Response data:
        ```ts
        {
          deleted: boolean, // True if the category has been deleted
          categories: string[] // The list of categories after the operation
        }
        ```
  - `categories:list`: List all categories
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        // none
        ``` 
      - Response data:
        ```ts
        string[] // The list of categories
        ```
  - `categories:create-mapping`: Creates a new category mapping
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        {
          key: string, // The key of the new mapping
          category: string, // The category this mapping should result in
        }
        ``` 
      - Response data:
        ```ts
        {
          created: boolean, // True if the mapping has been created
          mappings: { [key: string]: string } // The mappings after the operation
        }
        
        ```
  - `categories:delete-mapping`: Deletes a category mapping
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        {
          key: string // The key of the mapping to delete
        }
        ``` 
      - Response data:
        ```ts
        {
          deleted: boolean, // True if the mapping has been deleted
          mappings: { [key: string]: string } // The mappings after the operation
        }
        ```
  - `categories:mappings`: Returns current mappings
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        // none
        ``` 
      - Response data:
        ```ts
        { [key: string]: string } // The mappings
        ```
  - `categories:maximum`: Get or set the maximum of categories allowed
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        number | null // The maximum to set, or none
        ``` 
      - Response data:
        ```ts
        number // The maximum of allowed categoreis after the operation
        ```
  - `categories:get`: Gets the categories of a meme
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        string, // The id of the meme
        ``` 
      - Response data:
        ```ts
        string[] // The categories of the meme
        ```
  - `categories:set`: Sets the categories of a meme
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        {
          meme_id: string, // The id of the meme
          categories: string[], // The categories to set
          validate: boolean // If true, categories will be validated before setting them
        }
        ``` 
      - Response data:
        ```ts
        boolean // True if the categories have been set
        ```
  - `categories:add`: Adds categories to a meme
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        {
          meme_id: string, // The id of the meme
          categories: string[], // The categories to add
          validate: boolean // If true, categories will be validated before adding them
        }
        ``` 
      - Response data:
        ```ts
        boolean // True if categories have been added
        ```
  - `categories:remove`: Removes categories from a meme
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        {
          meme_id: string, // The id of the meme
          categories: string[], // The categories to remove
          validate: boolean // If true, categories will be validated before removing them
        }
        ``` 
      - Response data:
        ```ts
        boolean // True if categories have been removed
        ```
  - `categories:validate`: Validates categories.
    Accepts either a single category or a list of categories. If a single category has been requested,
    the worker will respond with a single one. If a list of categories has been requested, the worker
    will respond with a list.

    A single category might be `null` or a valid category. `null` indicates that the cateory is not valid
    A list of categories will only contain valid categories but might be empty.
      - Worker: `MemeHub-Categories`
      - Request data:
        ```ts
        string | string[] // A single category or a list of categories to validate
        ``` 
      - Response data:
        ```ts
        null | string | string[] // A single validated vategory or a list of validated categories
        ```

### Config
  - `config:set`: Set config keys to new values.
    Accepts a dictionary of keys and their new values.
      - Worker: `MemeHub-Config`
      - Request data:
        ```ts
        object // A dictionary with the config keys and their new values
        ```
      - Response data:
        ```ts
        boolean // True, if the config has been updated
        ```
